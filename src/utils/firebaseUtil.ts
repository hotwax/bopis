import { api, commonUtil, firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

/*
 * Push notifications on this device: the permission prompt, the FCM push worker, the locally
 * recorded token, registering the token with the backend and attaching the Firebase listeners.
 * Login (the user store), app mount and the screens all call initialiseFirebaseMessaging from here.
 * The Enable chain and the health check the screens use live in the useNotificationDeviceSetup
 * composable.
 */

/**
 * The registration token the backend has CONFIRMED it holds for this device.
 *
 * Only written after the backend accepts it, so the setup store judges "registered" on a fact rather
 * than on a persisted flag. Kept outside the notification store because that store is cleared on
 * logout, whereas this is a fact about the browser's FCM token rather than about the session.
 */
const REGISTERED_TOKEN_KEY = "bopis.fcm.registeredToken";

export function readRegisteredToken() {
  try {
    return localStorage.getItem(REGISTERED_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function writeRegisteredToken(token: string) {
  try {
    localStorage.setItem(REGISTERED_TOKEN_KEY, token);
  } catch (error) {
    logger.error("Failed to record the Firebase registration token", error);
  }
}

export function clearRegisteredToken() {
  try {
    localStorage.removeItem(REGISTERED_TOKEN_KEY);
  } catch {
    // Nothing to do: a stale entry only costs one redundant check.
  }
}

/** "POST firebase/token: 400 <message>" — enough to tell what the backend answered. */
export function describeApiError(call: string, error: any) {
  const status = error?.response?.status ?? error?.status ?? "";
  const body = error?.response?.data ?? error?.data;
  let detail: string;
  try {
    detail = body ? JSON.stringify(body) : String(error?.message || error || "");
  } catch {
    detail = String(error?.message || error || "");
  }
  return `${call}: ${status} ${detail}`.replace(/\s+/g, " ").trim().slice(0, 300);
}

/**
 * Only a confirmed "there is no such row" makes it safe to carry on to the POST.
 *
 * Any other failure — network, 5xx, auth — leaves us unable to say whether the backend still
 * holds the old token. store#ClientRegistrationToken would then silently keep that row while we
 * recorded the new token as registered, and every later resume would short-circuit on the match.
 */
export function isMissingRow(error: any) {
  const status = error?.response?.status ?? error?.status;
  if (status === 404) return true;
  // A real status that is not 404 is a definite answer, and it is not "missing".
  if (typeof status === "number") return false;
  const detail = JSON.stringify(error?.response?.data ?? error?.data ?? error?.message ?? "");
  return /not[\s_-]*found|does not exist/i.test(detail);
}

/**
 * Ask for notification permission when it has not been decided yet, and report where it landed.
 *
 * MUST be called from inside a tap and BEFORE the handler's first await. WebKit only honours the
 * request while the user gesture is live: outside one it refuses silently and leaves permission at
 * "default", so nothing appears and nothing looks wrong.
 */
export async function requestNotificationPermissionFromGesture(): Promise<string> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch (error) {
    logger.error("Could not request notification permission", error);
    return Notification.permission;
  }
}

/**
 * Whether messaging can be initialised WITHOUT showing a permission prompt.
 *
 * Login and app mount have no user gesture, and iOS and Firefox refuse a prompt from outside one,
 * leaving permission at "default". So those paths may only initialise for a device that has already
 * granted, where requestPermission resolves immediately and prompts nobody. Asking is the job of a
 * real tap: the Enable button on the settings screen.
 */
const canInitialiseWithoutPrompting = () =>
  typeof Notification !== "undefined" && Notification.permission === "granted";

/**
 * Whether this is an iOS/iPadOS device, where a blocked permission can only be recovered by
 * removing the Home Screen app and adding it again — browsers instead reset it in site settings.
 *
 * iPadOS 13+ sends a desktop macOS user agent on purpose, so the tell is a Mac platform that also
 * reports touch points; a real Mac reports zero.
 */
const isApplePushPlatform = () => {
  if (typeof navigator === "undefined") return false;
  const isIpadOS = /Mac/.test((navigator as any).platform ?? "") && (navigator.maxTouchPoints ?? 0) > 1;
  return isIpadOS || /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// The Firebase SDK hardcodes both of these, so registering at exactly this path and scope means
// getToken() reuses what we register here instead of making its own.
export const FCM_SW_PATH = "/firebase-messaging-sw.js";
export const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

// getToken() calls pushManager.subscribe() immediately after registering, without waiting for the
// worker to reach "activated". Subscribing against a registration whose active worker is still null
// throws AbortError, which is why a device can fail here forever while everything else looks healthy.
export function waitForActivation(registration: any, timeoutMs = 10000): Promise<boolean> {
  if (registration.active) return Promise.resolve(true);

  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve(false);
  if (worker.state === "activated") return Promise.resolve(true);
  if (worker.state === "redundant") return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const done = (value: boolean) => {
      worker.removeEventListener("statechange", onStateChange);
      clearTimeout(timer);
      resolve(value);
    };
    const onStateChange = () => {
      if (worker.state === "activated") done(true);
      else if (worker.state === "redundant") done(false);
    };
    const timer = setTimeout(() => done(!!registration.active), timeoutMs);

    worker.addEventListener("statechange", onStateChange);
  });
}

export function findPushWorkerRegistration(registrations: readonly ServiceWorkerRegistration[]) {
  const matches = registrations.filter((registration: any) =>
    registration.scope.includes("firebase-cloud-messaging-push-scope")
    || (registration.active || registration.waiting || registration.installing)?.scriptURL?.includes("firebase-messaging-sw.js"));
  // More than one can match — a legacy worker at root scope next to the scoped one — and only an
  // active one can receive, so that is the one every caller wants.
  return matches.find((registration: any) => registration.active) ?? matches[0];
}

export type StepReporter = (label: string, ok: boolean, detail?: string) => void;

/**
 * Make sure the FCM push worker is registered AND active before anything asks for a token.
 *
 * On a fresh device the SDK does both jobs at once inside getToken(), and the subscribe races the
 * activation (see waitForActivation). Returns the active registration, or null.
 */
export async function ensurePushWorker(report: StepReporter = () => undefined): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    report("Service workers are unavailable in this context", false, "Push cannot work here at all");
    return null;
  }

  let existing: any;
  try {
    existing = findPushWorkerRegistration(await navigator.serviceWorker.getRegistrations());
  } catch (error: any) {
    logger.error("Could not read service worker registrations", error);
    report("Could not read service worker registrations", false, String(error?.message || error));
    return null;
  }

  if (existing) {
    // Cheapest repair first: an update picks up a changed script without dropping the push
    // subscription, which an unregister would destroy.
    try {
      await existing.update();
    } catch (error) {
      logger.warn("Push worker update check failed", error);
    }
    if (existing.active && !existing.waiting) {
      report("Push worker is active", true, existing.scope);
      return existing;
    }
    // A worker stuck waiting never takes over on its own, and one that is not active cannot
    // subscribe, so start over. That drops the push subscription, which is fine here: the caller
    // registers a fresh token right after.
    try {
      await existing.unregister();
      report("Removed a push worker that was not active", true, `${existing.scope} — state ${(existing.active || existing.waiting || existing.installing)?.state ?? "none"}`);
    } catch (error: any) {
      logger.error("Could not unregister the inactive push worker", error);
      report("Could not remove the inactive push worker", false, String(error?.message || error));
      return null;
    }
  } else {
    report("No push worker registered yet", true, "registering it now");
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register(FCM_SW_PATH, { scope: FCM_SW_SCOPE });
  } catch (error: any) {
    // Usually the script 404ing, being served as HTML by the SPA fallback, or importScripts to
    // gstatic being blocked on this network.
    logger.error("Failed to register firebase-messaging-sw.js", error);
    report("Push worker registration failed", false, String(error?.message || error));
    return null;
  }

  const activated = await waitForActivation(registration);
  report(activated ? "Push worker activated" : "Push worker never activated", activated,
    activated ? registration.scope : "Check that the script is served as JavaScript and that gstatic.com is reachable");
  return activated ? registration : null;
}

export type NotificationHealthIssue = "unsupported" | "config" | "permissionDenied" | "permissionDefault"
  | "serviceWorker" | "pushSubscription" | "deviceId" | "token";

export type DeviceSetupStep = "support" | "config" | "permission" | "serviceWorker" | "registration" | "verification";
export interface DeviceSetupStepResult { label: string; ok: boolean; detail?: string }
export interface DeviceSetupResult {
  ok: boolean;
  failedStep?: DeviceSetupStep;
  permission: string;
  deviceId: string;
  steps: DeviceSetupStepResult[];
}

/** Focus and visibility both fire on a resume, so repeated checks are collapsed into one. */
const TOKEN_CHECK_MIN_INTERVAL_MS = 60 * 1000;

let lastTokenCheckAt = 0;
/** Why the last initialiseFirebaseMessaging did not end with a registered token, for the setup report. */
let lastInitialiseError = "";
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
export async function registerToken(token: string) {
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
export const initialiseFirebaseMessaging = async (): Promise<boolean> => {
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
  lastInitialiseError = "";
  const recordError = (error: any) => { lastInitialiseError = String(error?.message || error || ""); };

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

/** Why the last initialiseFirebaseMessaging did not end with a registered token, for the setup report. */
export const getLastInitialiseError = () => lastInitialiseError;

export const firebaseUtil = {
  initialiseFirebaseMessaging,
  canInitialiseWithoutPrompting,
  requestNotificationPermissionFromGesture,
  isApplePushPlatform
}
