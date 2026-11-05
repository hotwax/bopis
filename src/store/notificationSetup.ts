import { defineStore } from "pinia";
import { api, commonUtil, firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import {
  clearRegisteredToken, describeApiError, ensurePushWorker, isMissingRow, readRegisteredToken, writeRegisteredToken
} from "@/utils/firebaseUtil";

/*
 * Registering this device's token with the backend and attaching the Firebase listeners. A store
 * because login (the user store's postLogin) needs it as well as the screens, and a store cannot
 * call a composable. The Enable chain and the device checks the screens use live in the
 * useNotificationDeviceSetup composable.
 */

/** Focus and visibility both fire on a resume, so repeated checks are collapsed into one. */
const TOKEN_CHECK_MIN_INTERVAL_MS = 60 * 1000;

let lastTokenCheckAt = 0;
let isCheckingToken = false;
let isResumeWatcherAttached = false;
/** Why the most recent registerToken returned false, for the setup report. */
let lastRegisterTokenError = "";

/**
 * initialiseFirebaseApp attaches a fresh foreground and background listener on every call, and the
 * Firebase SDK offers no way to remove them. Only the listener from the latest call is live, so
 * calling initialise again (login, app mount, Enable) never delivers a notification twice.
 */
let activeListenerId = 0;

/**
 * Register `token` for this device, replacing the stored row whenever we cannot prove the backend
 * already holds exactly this token, and report whether the backend accepted it.
 *
 * `store#ClientRegistrationToken` looks its row up on (userLoginId, deviceId, applicationId) and
 * IGNORES the registrationToken, returning early when a row exists. So posting a rotated token is
 * a silent no-op server side and deleting first is what makes it stick. The delete also
 * unsubscribes the dead token from this device's topics, and the store subscribes the new one to
 * those same topics.
 *
 * Calls `api` directly rather than the notification store's actions, which swallow their errors
 * and resolve regardless, so success would be indistinguishable from failure.
 */
async function registerToken(token: string) {
  lastRegisterTokenError = "";
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
      if (commonUtil.hasError(resp)) throw resp;
    } catch (error) {
      if (!isMissingRow(error)) {
        // Stop rather than post into the dark: the row may well still hold the old token, the
        // POST would be a silent no-op against it, and caching the new token here would end all
        // future retries. Clearing the cache keeps the next resume on the replace path.
        clearRegisteredToken();
        lastRegisterTokenError = describeApiError("DELETE firebase/token", error);
        logger.error("Could not remove the previous registration token; leaving it unreplaced", error);
        return false;
      }
      logger.warn("No previous registration token to remove", error);
    }
  }

  try {
    const resp: any = await api({ url: "firebase/token", method: "post", data: { registrationToken: token, deviceId, applicationId } });
    if (commonUtil.hasError(resp)) throw resp;
  } catch (error) {
    // Clear rather than record: an empty cache forces the next attempt back down the
    // delete-then-store path, instead of trusting a write the backend never accepted.
    clearRegisteredToken();
    lastRegisterTokenError = describeApiError("POST firebase/token", error);
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
    // getApps() answers "can I ask for a token right now" in this page.
    if (!getApps().length) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    // Only a device registered in this session has a row to keep current. After logout the Firebase
    // app is still there, and registering from the login screen would re-create the row preLogout
    // just deleted, without a session to do it with.
    if (!useNotificationStore().isFirebaseInitialised) return;

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
 * the app coming back rather than to a timer. The WebView reports a resume through the same DOM
 * events a browser tab does.
 */
function attachResumeWatcher() {
  if (isResumeWatcherAttached) return;
  isResumeWatcherAttached = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshRegistrationToken();
  });
  window.addEventListener("focus", () => refreshRegistrationToken());
}

/**
 * Initialise messaging and register this device's token. Never throws, so login and app mount
 * cannot be broken by messaging.
 *
 * Returns whether the backend now holds this device's token: initialiseFirebaseApp also resolves
 * when push is unsupported or permission was refused, so "it resolved" is not "this device can
 * receive". Storing the token subscribes it to the topics already saved for this device, so a
 * device receives exactly what was switched on for it.
 */
const initialiseFirebaseMessaging = async (): Promise<boolean> => {
  const notificationStore = useNotificationStore();

  // Attached before any early return below, so a rotated token is still caught on a later resume.
  attachResumeWatcher();

  let appFirebaseConfig = null as any;
  try {
    const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
    appFirebaseConfig = rawConfig ? JSON.parse(rawConfig as any) : null;
  } catch (error) {
    logger.error("Firebase config is not valid JSON", error);
  }
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  let tokenRegistered = false;
  const setupStore = useNotificationSetupStore();
  setupStore.lastInitialiseError = "";
  const recordError = (error: any) => { setupStore.lastInitialiseError = String(error?.message || error || ""); };

  if (!appFirebaseConfig?.apiKey) {
    recordError("Firebase is not configured for this build");
    return false;
  }

  // Every caller gets an active worker before any token is asked for, so getToken cannot lose the
  // subscribe/activation race on a fresh device.
  const pushWorker = await ensurePushWorker((label, ok, detail) => {
    if (!ok) logger.warn(`Push worker: ${label}`, detail);
  });
  if (!pushWorker) {
    recordError("The push worker could not be installed or activated on this device");
    logger.error("Skipping Firebase initialisation, no active push worker");
    return false;
  }

  const listenerId = ++activeListenerId;
  try {
    const outcome = await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        tokenRegistered = await registerToken(token);
      },
      (notification: any) => {
        if (listenerId !== activeListenerId) return;
        notificationStore.addNotification({ ...notification.notification, isForeground: notification.isForeground, time: DateTime.now().toMillis() });
      }
    );

    // Only a token the backend accepted makes this device initialised. initialiseFirebaseApp also
    // resolves when push is unsupported or permission was refused, and that used to set this flag.
    if (tokenRegistered) {
      notificationStore.isFirebaseInitialised = true;
    } else if (outcome?.status === "unsupported") {
      recordError("Firebase reports push is not supported in this context");
    } else if (outcome?.status === "permission") {
      recordError(`Firebase did not get notification permission (it read "${outcome.permission}"), so no token was requested`);
    } else if (outcome?.status === "token") {
      recordError(`A token was issued but the backend did not accept it — ${lastRegisterTokenError || "no detail"}`);
    }
  } catch (error) {
    recordError(error);
    logger.error("Failed to initialize notifications", error);
  }

  return tokenRegistered;
}

export const useNotificationSetupStore = defineStore("notificationSetup", {
  state: () => ({
    /** Why the last initialiseFirebaseMessaging did not end with a registered token, for the setup report. */
    lastInitialiseError: ""
  }),
  actions: {
    registerToken,
    initialiseFirebaseMessaging
  }
});
