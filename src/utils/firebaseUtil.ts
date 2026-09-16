import { firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

/**
 * The registration token last handed to the backend. It has to outlive a reload, because that is
 * exactly when a rotated token would otherwise be posted, silently ignored and forgotten.
 *
 * Not scoped per OMS instance on purpose: FCM issues one token per browser regardless of which
 * instance is signed in, and every login posts the current token anyway, so an instance that has
 * no row for this device still gets one.
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
    // Blocked site storage means every rotation re-registers instead of being skipped, which is
    // wasteful but still correct.
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

/**
 * Register `token` for this device, replacing the stored row when the token has rotated.
 *
 * store#ClientRegistrationToken returns early when a row already exists for
 * (userLoginId, deviceId, applicationId) and keeps the registrationToken that is already on it,
 * so posting a rotated token does nothing server side. Deleting first is what makes the new token
 * stick, and it also unsubscribes the dead token from the user's topics.
 */
async function registerToken(token: string) {
  const notificationStore = useNotificationStore();
  const applicationId = import.meta.env.VITE_NOTIF_APP_ID;
  const deviceId = firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId);

  const registeredToken = readRegisteredToken();
  if (registeredToken && registeredToken !== token) {
    await notificationStore.removeClientRegistrationToken(deviceId, applicationId);
  }

  await notificationStore.storeClientRegistrationToken(token, deviceId, applicationId);
  writeRegisteredToken(token);
}

/**
 * Ask Firebase for the token it would issue right now and re-register it if it has rotated.
 *
 * FCM rotates registration tokens on its own schedule and the app is only told by getToken
 * returning something different, so this has to be asked rather than waited for.
 */
async function refreshRegistrationToken() {
  const notificationStore = useNotificationStore();
  if (!notificationStore.isFirebaseInitialised || isCheckingToken) return;
  if (Date.now() - lastTokenCheckAt < TOKEN_CHECK_MIN_INTERVAL_MS) return;

  isCheckingToken = true;
  try {
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
 * A device that was asleep or backgrounded for days is the case this is for, so the check is tied
 * to the app coming back rather than to a timer. @capacitor/app is not a dependency here, and the
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
  const notificationStore = useNotificationStore();
  if (notificationStore.isFirebaseInitialised) return;

  const appFirebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (appFirebaseConfig && appFirebaseConfig.apiKey && notificationStore.getAllNotificationPrefs?.length) {
    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        // Covers a rotation that happened while the app was closed: this runs on every login and
        // reload, and registerToken replaces the row when the token no longer matches.
        await registerToken(token);
      },
      (notification: any) => {
        notificationStore.addNotification({...notification.notification, isForeground: notification.isForeground, time: DateTime.now().toMillis()});
      }
    );
    notificationStore.isFirebaseInitialised = true;
    attachResumeWatcher();
  }
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}
