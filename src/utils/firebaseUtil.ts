import { api, commonUtil, firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

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
/** Why the last initialiseFirebaseMessaging did not end with a registered token, for the setup report. */
let lastInitialiseError: unknown = null;

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
/**
 * Only a confirmed "there is no such row" makes it safe to carry on to the POST.
 *
 * Any other failure — network, 5xx, auth — leaves us unable to say whether the backend still
 * holds the old token. store#ClientRegistrationToken would then silently keep that row while we
 * recorded the new token as registered, and every later resume would short-circuit on the match.
 */
function isMissingRow(error: any) {
  const status = error?.response?.status ?? error?.status;
  if (status === 404) return true;
  // A real status that is not 404 is a definite answer, and it is not "missing".
  if (typeof status === "number") return false;
  const detail = JSON.stringify(error?.response?.data ?? error?.data ?? error?.message ?? "");
  return /not[\s_-]*found|does not exist/i.test(detail);
}

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
      if (commonUtil.hasError(resp)) throw resp;
    } catch (error) {
      if (!isMissingRow(error)) {
        // Stop rather than post into the dark: the row may well still hold the old token, the
        // POST would be a silent no-op against it, and caching the new token here would end all
        // future retries. Clearing the cache keeps the next resume on the replace path.
        clearRegisteredToken();
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

/**
 * Whether messaging can be initialised WITHOUT showing a permission prompt.
 *
 * `Notification.requestPermission()` must originate from a user gesture. iOS refuses it outright
 * from any other context, logging "Notification prompting can only be done from a user gesture",
 * and leaves permission at "default" rather than "denied" — so nothing looks broken while no
 * prompt, no token and no service worker are ever created. Firefox behaves the same way.
 *
 * Login and app mount have no gesture, so they may only initialise for a device that has already
 * granted, where requestPermission resolves immediately and prompts nobody. Asking is the job of
 * a real tap; see the settings screen.
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
  // Already settled: nothing will fire statechange again, so waiting would only run out the clock.
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
  // active one can receive, so that is the one every caller wants to know about.
  return matches.find((registration: any) => registration.active) ?? matches[0];
}

export type StepReporter = (label: string, ok: boolean, detail?: string) => void;

/**
 * Make sure the FCM push worker is registered AND active before anything asks for a token.
 *
 * On a fresh device the SDK does both jobs at once inside getToken(), and the subscribe races the
 * activation (see waitForActivation). Doing the registration here, and only handing over once the
 * worker is active, is what turns that intermittent failure into a step that either succeeds or
 * reports exactly why it did not. Returns the active registration, or null.
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
    // A worker stuck waiting never takes over on its own (firebase-messaging-sw.js has no
    // skipWaiting) and one that is not active cannot subscribe, so start over. That drops the
    // push subscription, which is fine here: the caller registers a fresh token right after.
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

/**
 * Boot-path initialisation. Never throws, so login and app mount cannot be broken by messaging.
 *
 * Returns whether the backend now holds this device's token. The boot callers ignore that; the
 * settings button cannot, because "initialiseFirebaseApp resolved" is not "this device can
 * receive": it also resolves when push is unsupported or permission was refused, and the backend
 * can refuse the token.
 */
const initialiseFirebaseMessaging = async (): Promise<boolean> => {
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

  let tokenRegistered = false;
  lastInitialiseError = null;

  if (appFirebaseConfig && appFirebaseConfig.apiKey) {
    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        // Runs on every login and reload, so it also covers a rotation that happened while the
        // app was closed: registerToken replaces the row when the token no longer matches.
        tokenRegistered = await registerToken(token);
      },
      (notification: any) => {
        notificationStore.addNotification({...notification.notification, isForeground: notification.isForeground, time: DateTime.now().toMillis()});
      }
    ).then(() => {
      // Only a token the backend accepted makes this device initialised. initialiseFirebaseApp also
      // resolves when push is unsupported or permission was refused, and that used to set this flag.
      if (tokenRegistered) notificationStore.isFirebaseInitialised = true;
    }).catch((err) => {
      lastInitialiseError = err;
      logger.error("Failed to initialize notifications", err)
    });
  }

  return tokenRegistered;
}

/**
 * Whether this device can receive a push right now, judged on observable facts rather than on
 * persisted flags: permission granted, an active push worker, and a token the backend confirmed.
 */
export async function isDeviceSetUp(): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  if (!useNotificationStore().getFirebaseDeviceId || !readRegisteredToken()) return false;
  try {
    const existing: any = findPushWorkerRegistration(await navigator.serviceWorker?.getRegistrations?.() ?? []);
    return !!existing?.active;
  } catch {
    return false;
  }
}

export type DeviceSetupStep = "support" | "config" | "permission" | "serviceWorker" | "registration" | "verification";
export interface DeviceSetupStepResult { label: string; ok: boolean; detail?: string }
export interface DeviceSetupResult {
  ok: boolean;
  failedStep?: DeviceSetupStep;
  permission: string;
  deviceId: string;
  steps: DeviceSetupStepResult[];
}

/**
 * The whole chain, from one tap: support → config → permission → active push worker → token
 * registered with the backend → verified → subscriptions re-read. Stops at the first link that
 * fails and names it, so the caller never reports "allowed" for a device that cannot receive.
 *
 * Must be called from a user gesture: the permission prompt will not appear from anywhere else.
 * userId is passed in rather than read from the user store, which imports this module.
 */
export async function setUpNotificationsOnThisDevice({ userId }: { userId?: string } = {}): Promise<DeviceSetupResult> {
  const steps: DeviceSetupStepResult[] = [];
  const report: StepReporter = (label, ok, detail) => steps.push({ label, ok, detail });
  const notificationStore = useNotificationStore();
  const permissionNow = () => (typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const fail = (failedStep: DeviceSetupStep): DeviceSetupResult => {
    logger.error("Notification setup on this device did not complete", { failedStep, steps });
    return { ok: false, failedStep, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
  };

  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator
    && typeof Notification !== "undefined" && await isSupported();
  report("Push supported in this context", supported, supported ? undefined : "iOS needs the Home Screen app over HTTPS, 16.4 or later");
  if (!supported) return fail("support");

  let config: any = null;
  try {
    config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  } catch {
    config = null;
  }
  const configured = !!config?.apiKey && !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
  report("Firebase config and VAPID key present", configured);
  if (!configured) return fail("config");

  // Inside the tap: iOS only shows the prompt for a user gesture.
  const permission = await Notification.requestPermission();
  report(`Permission: ${permission}`, permission === "granted",
    permission === "denied" ? "Blocked on this device; recovery differs by platform" : undefined);
  if (permission !== "granted") return fail("permission");

  const registration = await ensurePushWorker(report);
  if (!registration) return fail("serviceWorker");

  // Same path the boot uses, so the foreground handlers get attached too — but with the worker
  // already active, getToken cannot lose the subscribe/activation race.
  const registered = await initialiseFirebaseMessaging();
  report("Token registered with the backend", registered, registered
    ? `deviceId ${notificationStore.getFirebaseDeviceId}`
    : String((lastInitialiseError as any)?.message || lastInitialiseError || "the backend refused the token or no token was issued"));
  if (!registered) return fail("registration");

  const verified = await isDeviceSetUp();
  report("Device verified end to end", verified, verified ? undefined : "permission, active worker or confirmed token is missing");
  if (!verified) return fail("verification");

  // Informational: the token store back-fills the user's existing topic subscriptions server side.
  if (userId) {
    try {
      await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID as any, userId);
      report("Server-side topic subscriptions", true, String(notificationStore.getAllNotificationPrefs?.length ?? 0));
    } catch (error) {
      logger.warn("Could not re-read topic subscriptions after setup", error);
    }
  }

  logger.warn("Notification setup on this device completed", steps);
  return { ok: true, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
}

export const firebaseUtil = {
  canInitialiseWithoutPrompting,
  isApplePushPlatform,
  initialiseFirebaseMessaging,
  isDeviceSetUp,
  setUpNotificationsOnThisDevice
}
