import { defineStore } from "pinia";
import { api, commonUtil, firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import {
  type DeviceSetupResult, type DeviceSetupStep, type DeviceSetupStepResult, type NotificationHealthIssue, type StepReporter,
  clearRegisteredToken, describeApiError, ensurePushWorker, findPushWorkerRegistration, isMissingRow, readRegisteredToken, writeRegisteredToken
} from "@/utils/firebaseUtil";

/*
 * Registering this device for push: the token with the backend, the Firebase listeners, the Enable
 * chain and the health check the settings card reads. A store because login (the user store) needs
 * it as well as the screens, and it calls the API.
 */

/** Focus and visibility both fire on a resume, so repeated checks are collapsed into one. */
const TOKEN_CHECK_MIN_INTERVAL_MS = 60 * 1000;

let lastTokenCheckAt = 0;
let isCheckingToken = false;
let isResumeWatcherAttached = false;
/** Why the last initialiseFirebaseMessaging did not end with a registered token, for the setup report. */
let lastInitialiseError: unknown = null;
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
  lastInitialiseError = null;

  if (!appFirebaseConfig?.apiKey) {
    lastInitialiseError = new Error("Firebase is not configured for this build");
    return false;
  }

  // Every caller gets an active worker before any token is asked for, so getToken cannot lose the
  // subscribe/activation race on a fresh device.
  const pushWorker = await ensurePushWorker((label, ok, detail) => {
    if (!ok) logger.warn(`Push worker: ${label}`, detail);
  });
  if (!pushWorker) {
    lastInitialiseError = new Error("The push worker could not be installed or activated on this device");
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
      lastInitialiseError = new Error("Firebase reports push is not supported in this context");
    } else if (outcome?.status === "permission") {
      lastInitialiseError = new Error(`Firebase did not get notification permission (it read "${outcome.permission}"), so no token was requested`);
    } else if (outcome?.status === "token") {
      lastInitialiseError = new Error(`A token was issued but the backend did not accept it — ${lastRegisterTokenError || "no detail"}`);
    }
  } catch (error) {
    lastInitialiseError = error;
    logger.error("Failed to initialize notifications", error);
  }

  return tokenRegistered;
}

/**
 * Whether this device can receive a push right now, judged on observable facts rather than on
 * persisted flags: permission granted, an active push worker, and a token the backend confirmed.
 */
async function isDeviceSetUp(): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if (!useNotificationStore().getFirebaseDeviceId || !readRegisteredToken()) return false;
  try {
    const existing: any = findPushWorkerRegistration(await navigator.serviceWorker?.getRegistrations?.() ?? []);
    return !!existing?.active;
  } catch {
    return false;
  }
}

/**
 * The first reason this device cannot receive notifications, or null when nothing is wrong.
 *
 * Checked in the same order the Enable flow repairs things, so the reported issue is always the
 * next one that flow would run into. Every check reads observable state, never a persisted flag.
 */
async function getNotificationHealthIssue(): Promise<NotificationHealthIssue | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof Notification === "undefined") return "unsupported";

  let config: any;
  try {
    config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  } catch {
    config = null;
  }
  if (!config?.apiKey || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return "config";

  if (Notification.permission === "denied") return "permissionDenied";
  if (Notification.permission !== "granted") return "permissionDefault";

  try {
    if (!await isSupported()) return "unsupported";
  } catch {
    return "unsupported";
  }

  let pushWorker: any;
  try {
    pushWorker = findPushWorkerRegistration(await navigator.serviceWorker.getRegistrations());
  } catch (error) {
    logger.warn("Notification health check could not read service worker registrations", error);
    return "serviceWorker";
  }
  if (!pushWorker?.active) return "serviceWorker";

  // A granted device with an active worker can still have no subscription — the token handshake
  // never completed, or unregistering a broken worker dropped it — and then FCM has nowhere to send.
  try {
    if (!await pushWorker.pushManager?.getSubscription?.()) return "pushSubscription";
  } catch (error) {
    logger.warn("Notification health check could not read the push subscription", error);
    return "pushSubscription";
  }

  if (!useNotificationStore().getFirebaseDeviceId) return "deviceId";
  if (!readRegisteredToken()) return "token";

  return null;
}

/**
 * The whole chain, from one tap: permission → config → support → active push worker → token
 * registered with the backend → verified. Stops at the
 * first link that fails and names it, so the caller never reports "allowed" for a device that
 * cannot receive.
 *
 * Must be called from a user gesture, and before the caller does anything else in that tap: the
 * permission prompt will not appear from anywhere else. The request is made synchronously, before
 * this function's first await.
 */
async function setUpNotificationsOnThisDevice(): Promise<DeviceSetupResult> {
  const steps: DeviceSetupStepResult[] = [];
  const report: StepReporter = (label, ok, detail) => steps.push({ label, ok, detail });
  const notificationStore = useNotificationStore();
  const permissionNow = () => (typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const fail = (failedStep: DeviceSetupStep): DeviceSetupResult => {
    logger.error("Notification setup on this device did not complete", { failedStep, steps });
    return { ok: false, failedStep, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
  };

  // The permission request is started before anything else in the tap: WebKit only shows the
  // prompt inside the tap's short transient activation, and any await first can spend it. Only the
  // synchronous check that the API exists comes first, since calling a missing Notification throws.
  const hasPushApis = typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof Notification !== "undefined";
  if (!hasPushApis) {
    report("Push supported in this context", false, "No Notification or service worker API here");
    return fail("support");
  }

  const permissionBefore = Notification.permission;
  const askedAt = Date.now();
  const permissionRequest = Notification.requestPermission();

  let config: any;
  try {
    config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  } catch {
    config = null;
  }
  const configured = !!config?.apiKey && !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
  report("Firebase config and VAPID key present", configured);
  if (!configured) {
    permissionRequest.catch(() => undefined);
    return fail("config");
  }

  let permission: string;
  try {
    permission = await permissionRequest;
  } catch (error) {
    logger.error("Notification permission request failed", error);
    permission = Notification.permission;
  }
  // How long the request took separates "the user answered a prompt" from "the platform answered
  // without showing one", which the result alone cannot: both can come back "denied".
  report(`Permission: ${permission}`, permission === "granted", `was ${permissionBefore}, answered in ${Date.now() - askedAt}ms`);
  if (permission !== "granted") return fail("permission");

  const supported = await isSupported();
  report("Push supported in this context", supported, supported ? undefined : "iOS needs the Home Screen app over HTTPS, 16.4 or later");
  if (!supported) return fail("support");

  const registration = await ensurePushWorker(report);
  if (!registration) return fail("serviceWorker");

  const registered = await initialiseFirebaseMessaging();
  report("Token registered with the backend", registered, registered
    ? `deviceId ${notificationStore.getFirebaseDeviceId}`
    : String((lastInitialiseError as any)?.message || lastInitialiseError || "the backend refused the token or no token was issued"));
  if (!registered) return fail("registration");

  const verified = await isDeviceSetUp();
  report("Device verified end to end", verified, verified ? undefined : "permission, active worker or confirmed token is missing");
  if (!verified) return fail("verification");

  logger.warn("Notification setup on this device completed", steps);
  return { ok: true, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
}

export const useNotificationSetupStore = defineStore("notificationSetup", {
  actions: {
    registerToken,
    initialiseFirebaseMessaging,
    isDeviceSetUp,
    getNotificationHealthIssue,
    setUpNotificationsOnThisDevice
  }
});
