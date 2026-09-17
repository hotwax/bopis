import { api, commonUtil, firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

/**
 * The registration token we have CONFIRMED the backend holds for this device.
 *
 * Only written after the backend accepts it, so a failed write leaves the cache stale and the
 * next resume retries rather than assuming success. Kept outside the notification store because
 * that store is persisted and cleared on logout, whereas this is a fact about the browser's FCM
 * token rather than about the session.
 */
const REGISTERED_TOKEN_KEY = "bopis.fcm.registeredToken";

/** Focus and visibility both fire on a resume, so repeated checks are collapsed into one. */
const TOKEN_CHECK_MIN_INTERVAL_MS = 60 * 1000;

let lastTokenCheckAt = 0;
let isCheckingToken = false;
let isResumeWatcherAttached = false;

function readRegisteredToken() {
  try {
    return localStorage.getItem(REGISTERED_TOKEN_KEY) || "";
  } catch {
    // Blocked storage means every check re-registers instead of short-circuiting: wasteful, correct.
    return "";
  }
}

function writeRegisteredToken(token: string) {
  try {
    localStorage.setItem(REGISTERED_TOKEN_KEY, token);
  } catch (error) {
    logger.error("Failed to record the Firebase registration token", error);
  }
}

function clearRegisteredToken() {
  try {
    localStorage.removeItem(REGISTERED_TOKEN_KEY);
  } catch {
    // Nothing to do: a stale entry only costs one redundant re-registration.
  }
}

/**
 * Register `token` for this device, replacing the stored row whenever we cannot prove the backend
 * already holds exactly this token.
 *
 * `store#ClientRegistrationToken` looks its row up on (userLoginId, deviceId, applicationId) and
 * IGNORES the registrationToken, returning early when a row exists. So posting a rotated token is
 * a silent no-op server side and deleting first is what makes it stick. The delete also
 * unsubscribes the dead token from the user's topics, and the subsequent store back-fills the new
 * one into those same topics.
 *
 * These call `api` directly rather than the shared notification-store actions because those
 * actions swallow their errors and resolve regardless, which makes success indistinguishable from
 * failure. We must not cache a token the backend never accepted. Worth fixing in `common` so the
 * actions report a result; until then this path needs to see the response itself.
 */
/** Exported for tests: this is the decision the three review comments were about. */
export async function registerToken(token: string) {
  const notificationStore = useNotificationStore();
  const applicationId = import.meta.env.VITE_NOTIF_APP_ID;
  const deviceId = firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId);
  const registeredToken = readRegisteredToken();

  // An empty cache is NOT proof that the backend has no row: it is the upgrade case, and the
  // cleared/blocked-storage case. Treat "unknown" exactly like "different" and replace.
  if (registeredToken !== token) {
    try {
      const resp: any = await api({ url: "firebase/token", method: "delete", data: { deviceId, applicationId } });
      // api() resolves with an error BODY as well as throwing, so a bare try/catch is not enough.
      if (commonUtil.hasError(resp)) throw resp.data;
    } catch (error) {
      // A missing row is a fine reason to fail here, so keep going and let the store decide.
      logger.warn("Could not remove the previous registration token", error);
    }
  }

  try {
    const resp: any = await api({ url: "firebase/token", method: "post", data: { registrationToken: token, deviceId, applicationId } });
    if (commonUtil.hasError(resp)) throw resp.data;
  } catch (error) {
    // Clear rather than record: an empty cache forces the next attempt back down the
    // delete-then-store path, instead of trusting a write the backend never accepted.
    clearRegisteredToken();
    logger.error("Backend rejected the registration token", error);
    return false;
  }

  notificationStore.setFirebaseDeviceId(deviceId);
  writeRegisteredToken(token);
  return true;
}

/**
 * Ask Firebase for the token it would issue right now and re-register it if it has rotated.
 *
 * FCM rotates tokens on its own schedule and tells the app only by `getToken` returning something
 * different, so this has to be asked rather than waited for.
 */
async function refreshRegistrationToken() {
  if (isCheckingToken || Date.now() - lastTokenCheckAt < TOKEN_CHECK_MIN_INTERVAL_MS) return;

  isCheckingToken = true;
  try {
    /*
     * Gate on the SDK itself, never on `isFirebaseInitialised`. That flag is persisted, so after a
     * reload it rehydrates as true while this JavaScript context has no Firebase app at all.
     * `getApps()` is the only honest answer to "can I ask for a token right now".
     *
     * When it is empty there is nothing to refresh, and the token cannot be recovered until
     * something initialises Firebase in this context. See accxui#165, which stops that flag being
     * persisted and is what makes a post-reload recovery possible.
     */
    if (!getApps().length) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const token = await getToken(getMessaging(getApp()), { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (!token || token === readRegisteredToken()) return;

    await registerToken(token);
  } catch (error) {
    logger.error("Failed to refresh the Firebase registration token", error);
  } finally {
    lastTokenCheckAt = Date.now();
    isCheckingToken = false;
  }
}

/**
 * A device asleep or backgrounded for days is the case this exists for, so the check is tied to
 * the app coming back rather than to a timer. @capacitor/app is not a dependency here, and the
 * WebView reports a resume through the same DOM events a browser tab does.
 */
function attachResumeWatcher() {
  if (isResumeWatcherAttached) return;
  isResumeWatcherAttached = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshRegistrationToken();
  });
  window.addEventListener("focus", () => refreshRegistrationToken());
}

const initialiseFirebaseMessaging = async () => {
  logger.warn('Initializing firebase')
  const notificationStore = useNotificationStore();

  // Attached before any early return below: the watcher must survive a reload that skips
  // initialisation, which is precisely the lifecycle where a rotated token goes unnoticed.
  attachResumeWatcher();

  // if (notificationStore.isFirebaseInitialised) return;

  // An unset or malformed config used to throw here, rejecting the whole post-login flow.
  let appFirebaseConfig = null as any;
  try {
    const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
    appFirebaseConfig = rawConfig ? JSON.parse(rawConfig as any) : null;
  } catch (error) {
    logger.error("Firebase config is not valid JSON", error);
  }
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (appFirebaseConfig && appFirebaseConfig.apiKey) {
    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        // Runs on every login and reload, so it also covers a rotation that happened while the
        // app was closed: registerToken replaces the row when the token no longer matches.
        await registerToken(token);
      },
      (notification: any) => {
        notificationStore.addNotification({...notification.notification, isForeground: notification.isForeground, time: DateTime.now().toMillis()});
      }
    ).then(() => {
      notificationStore.isFirebaseInitialised = true;
    }).catch((err) => {
      logger.error("Failed to initialize notifications", err)
    });
  }
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}
