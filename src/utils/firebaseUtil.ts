import { api, commonUtil, emitter, firebaseMessaging, logger, translate, useNotificationStore } from "@common";
import { useNotificationHistoryStore } from "@/store/notificationHistory";
import { DateTime } from "luxon";
import { announceNewOrder, attachSpeechPrimer, showForegroundSystemNotification } from "@/utils/notificationAlert";
import { getApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import router from "@/router";
import { ORDER_PUSH_RECEIVED_EVENT } from "@/services/openOrderEvents";

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
/** Whether the most recent registerToken stored a token the backend had not seen for this device. */
let lastRegistrationChangedToken = false;

export interface TopicSyncResult { deviceId: string; joined: string[]; rejoined: string[]; unchanged: string[]; failed: string[] }
let lastTopicSync: TopicSyncResult | null = null;
/** The outcome of the topic sync run by the most recent initialiseFirebaseMessaging, for reporting. */
export function getLastTopicSync() { return lastTopicSync; }

/** Why the most recent registerToken returned false, for the setup report. */
let lastRegisterTokenError = "";

/** "DELETE firebase/token: 400 <message>" — enough to tell the two backend calls and their answers apart. */
function describeApiError(call: string, error: any) {
  const status = error?.response?.status ?? error?.status ?? "";
  const body = error?.response?.data ?? error?.data;
  let detail = "";
  try {
    detail = body ? JSON.stringify(body) : String(error?.message || error || "");
  } catch {
    detail = String(error?.message || error || "");
  }
  return `${call}: ${status} ${detail}`.replace(/\s+/g, " ").trim().slice(0, 300);
}

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
  lastRegistrationChangedToken = registeredToken !== token;
  writeRegisteredToken(token);
  return true;
}

/**
 * Make THIS device's topic subscriptions match what the user has switched on anywhere.
 *
 * Subscriptions are per device on the backend, and registering a token enrols the device in
 * nothing — so a second device registers cleanly, shows the switches on (they used to read the
 * user's other device) and never receives a thing. Every topic the user has on for any device is
 * joined here for this one.
 *
 * `rejoin` re-does the topics this device already has a row for. Used when the token just changed:
 * a row can exist from a switch flipped before any token was registered, in which case FCM never
 * learned the token, and the backend's re-subscribe is the only way to make it.
 */
export async function syncDeviceTopicSubscriptions({ userId, rejoin = false }: { userId: string; rejoin?: boolean }): Promise<TopicSyncResult> {
  const notificationStore = useNotificationStore();
  const applicationId = import.meta.env.VITE_NOTIF_APP_ID as string;
  const deviceId = notificationStore.getFirebaseDeviceId;
  const result: TopicSyncResult = { deviceId, joined: [], rejoined: [], unchanged: [], failed: [] };
  if (!deviceId) return result;

  // Cross-device on purpose: the question is what the USER wants, not what this device has.
  await notificationStore.fetchAllNotificationPrefs(applicationId, userId);
  const rows: any[] = notificationStore.getAllNotificationPrefs || [];
  const wanted = [...new Set(rows.filter((row) => row.topic && row.receiveNotifications !== "N").map((row) => row.topic as string))];
  const mine = new Set(rows.filter((row) => row.deviceId === deviceId).map((row) => row.topic as string));

  for (const topic of wanted) {
    try {
      if (!mine.has(topic)) {
        (await notificationStore.subscribeTopic(topic, applicationId, deviceId))
          ? result.joined.push(topic) : result.failed.push(topic);
      } else if (rejoin) {
        await notificationStore.unsubscribeTopic(topic, applicationId, deviceId);
        (await notificationStore.subscribeTopic(topic, applicationId, deviceId))
          ? result.rejoined.push(topic) : result.failed.push(topic);
      } else {
        result.unchanged.push(topic);
      }
    } catch (error) {
      // The store reports rather than throws; this is for anything unforeseen.
      logger.error(`Could not subscribe this device to ${topic}`, error);
      result.failed.push(topic);
    }
  }

  // Leave the store holding THIS device's rows: the settings screen reads them as "what is on here".
  try {
    await notificationStore.fetchAllNotificationPrefs(applicationId, userId, deviceId);
  } catch (error) {
    logger.warn("Could not re-read this device's subscriptions", error);
  }

  lastTopicSync = result;
  if (result.joined.length || result.rejoined.length || result.failed.length) logger.warn("Device topic subscriptions synced", result);
  return result;
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

const NOTIFICATIONS_PATH = "/notifications";

/**
 * Backend copy has no length limit, so it is trimmed to keep the toast about four lines tall
 * next to its buttons at phone width. The notifications page carries the untrimmed text.
 */
const TOAST_MAX_LENGTH = 100;

function buildToastMessage(payload: any) {
  const title = payload?.data?.title?.trim() || "";
  const body = payload?.data?.body?.trim() || "";

  // title and body are backend copy, not app strings, so only the fallback is translated.
  const message = [title, body].filter(Boolean).join(": ");
  if (!message) return translate("New notification received.");

  return message.length > TOAST_MAX_LENGTH ? `${message.slice(0, TOAST_MAX_LENGTH - 1).trimEnd()}\u2026` : message;
}

async function showNotificationToast(payload: any) {
  const toast = await commonUtil.showToast(buildToastMessage(payload), {
    position: "top",
    canDismiss: true,
    manualDismiss: true,
    buttons: [{
      text: translate("View"),
      handler: async () => {
        if (router.currentRoute.value.path !== NOTIFICATIONS_PATH) router.push({ path: NOTIFICATIONS_PATH });
      }
    }]
  }) as any;

  toast.present();
}

/**
 * Raise every alert a notification should produce: the system banner, the chime and the in-app
 * toast.
 *
 * Exported because new orders are also detected locally by diffing the order list, and an order
 * found that way must alert identically to one that arrived over push - otherwise the two paths
 * drift and only one of them gets fixed.
 *
 * The banner must go through the FCM worker specifically: it owns the notificationclick handler,
 * so a banner raised on any other registration would do nothing when tapped.
 */
export async function alertForNotification(payload: any, { showToast = true, playChime = true } = {}) {
  let pushWorker: ServiceWorkerRegistration | null = null;

  try {
    pushWorker = findPushWorkerRegistration(await navigator.serviceWorker?.getRegistrations?.() ?? []) ?? null;
  } catch (error) {
    logger.warn("Could not resolve the push worker for the foreground alert", error);
  }

  await showForegroundSystemNotification(payload, pushWorker);

  // if (playChime) announceNewOrder();
  if (showToast) await showNotificationToast(payload);
}

/**
 * Ask for notification permission when it has not been decided yet, and report where it landed.
 *
 * MUST be called from inside a tap and BEFORE the handler's first await. WebKit only honours the
 * request while the user gesture is live: outside one it refuses silently and leaves permission at
 * "default", so nothing appears and nothing looks wrong.
 *
 * Returns the resulting permission so a caller can tell "granted" from "the user said no" from
 * "already decided, nothing was shown".
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
    // A worker stuck waiting (older copies of firebase-messaging-sw.js had no skipWaiting) never
    // takes over on its own, and one that is not active cannot subscribe, so start over. That drops the
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
/**
 * `userId` lets the device be joined to the user's topics once its token is registered. Without it
 * the token is registered and nothing more — the callers that have no user in hand (the token
 * refresh on resume) rely on the backend carrying a rotated token across on its own.
 */
const initialiseFirebaseMessaging = async ({ userId }: { userId?: string } = {}): Promise<boolean> => {
  const notificationStore = useNotificationStore();

  // Attached before any early return below: the watcher must survive a reload that skips
  // initialisation, which is precisely the lifecycle where a rotated token goes unnoticed.
  attachResumeWatcher();
  // Speech has to be unlocked by a gesture before a push can ever use it, and a push brings none.
  attachSpeechPrimer();

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
    // getToken() registers the push worker itself when none exists and subscribes straight away,
    // without waiting for it to activate (checked against the bundled @firebase/messaging 0.12.4),
    // so on a fresh device the subscribe can fail with AbortError. Every caller — login, app mount,
    // the settings toggle and Enable — therefore gets an active worker before any token is asked for.
    const pushWorker = await ensurePushWorker((label, ok, detail) => {
      if (!ok) logger.warn(`Push worker: ${label}`, detail);
    });
    if (!pushWorker) {
      lastInitialiseError = new Error("The push worker could not be installed or activated on this device");
      logger.error("Skipping Firebase initialisation, no active push worker");
      return false;
    }

    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        // Runs on every login and reload, so it also covers a rotation that happened while the
        // app was closed: registerToken replaces the row when the token no longer matches.
        tokenRegistered = await registerToken(token);
      },
      async (notification: any) => {
        if (notification.isForeground) {
          // Banner only. The chime, the toast and the history row all come from the open order
          // watcher - raising them here as well would double up on any device where both push and
          // the watcher are working. The banner survives because it is tagged with the order id,
          // so the two paths collapse into one.
          //
          // The push is also a hint that something changed, so the watcher checks now rather than
          // on its next poll. Either way the alert has a single source.
          emitter.emit(ORDER_PUSH_RECEIVED_EVENT);
          //
          // It must be shown through the FCM worker specifically: that worker owns the
          // notificationclick handler, so a banner raised on any other registration would do
          // nothing when tapped.
          await alertForNotification(notification.notification, { showToast: false, playChime: false });
          return;
        }

        // A background message is the one case the local diff cannot see, so it is recorded here.
        // History is owned by this app's IndexedDB store rather than the persisted `@common`
        // store, so that it survives logout instead of being wiped with the session.
        await useNotificationHistoryStore().addNotification(notification.notification);
      }
    ).then((outcome) => {
      // Only a token the backend accepted makes this device initialised. initialiseFirebaseApp also
      // resolves when push is unsupported or permission was refused, and that used to set this flag.
      if (tokenRegistered) {
        notificationStore.isFirebaseInitialised = true;
        return;
      }

      // Resolving without a registered token has three different causes, and the setup report
      // used to collapse them into one generic line. Record which one it was.
      if (outcome?.status === "unsupported") {
        lastInitialiseError = new Error("Firebase reports push is not supported in this context");
      } else if (outcome?.status === "permission") {
        lastInitialiseError = new Error(`Firebase did not get notification permission (it read "${outcome.permission}"), so no token was requested`);
      } else if (outcome?.status === "token") {
        lastInitialiseError = new Error(`A token was issued but the backend did not accept it — ${lastRegisterTokenError || "no detail"}`);
      }
    }).catch((err) => {
      lastInitialiseError = err;
      logger.error("Failed to initialize notifications", err)
    });
  }

  // Per-device subscriptions: the token alone enrols this device in nothing.

  lastTopicSync = null;

  if (tokenRegistered && userId) {

    try {

      await syncDeviceTopicSubscriptions({ userId, rejoin: lastRegistrationChangedToken });

    } catch (error) {

      logger.error("Could not sync this device's topic subscriptions", error);

    }

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

/**
 * The first reason this device cannot receive notifications, or null when nothing is wrong.
 *
 * Checked in the same order the Enable flow repairs things, so the reported issue is always the
 * next one that flow would run into. Every check reads observable state — permission, the push
 * worker, the browser's push subscription, the locally confirmed token — never a persisted flag.
 */
export type NotificationHealthIssue = "unsupported" | "config" | "permissionDenied" | "permissionDefault"
  | "serviceWorker" | "pushSubscription" | "deviceId" | "token";

export async function getNotificationHealthIssue(): Promise<NotificationHealthIssue | null> {
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

export type DeviceSetupStep = "support" | "config" | "permission" | "serviceWorker" | "registration" | "verification" | "topics";
export interface DeviceSetupStepResult { label: string; ok: boolean; detail?: string }
export interface DeviceSetupResult {
  ok: boolean;
  failedStep?: DeviceSetupStep;
  permission: string;
  deviceId: string;
  steps: DeviceSetupStepResult[];
}

/**
 * The whole chain, from one tap: config → permission → support → active push worker → token
 * registered with the backend → verified → subscriptions re-read. Stops at the first link that
 * fails and names it, so the caller never reports "allowed" for a device that cannot receive.
 *
 * Must be called from a user gesture, and before the caller does anything else in that tap: the
 * permission prompt will not appear from anywhere else. The request is made synchronously, before
 * this function's first await, so a caller may start it and do other gesture work afterwards.
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

  // The permission request is started before anything else in the tap. The prompt is only shown
  // inside the tap's transient user activation, and WebKit's window is short: any await first, or
  // other gesture-gated work run ahead of it, can spend the activation and leave the device with no
  // prompt ever shown — the very failure this path exists to fix. Only the synchronous check that
  // the API exists comes first, since calling a missing Notification would throw; the config and
  // full support checks run after the request has been made.
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
    // The prompt is already up; its answer is simply not needed on a build that cannot register.
    permissionRequest.catch(() => undefined);
    return fail("config");
  }

  let permission: NotificationPermission;
  try {
    permission = await permissionRequest;
  } catch (error) {
    logger.error("Notification permission request failed", error);
    permission = Notification.permission;
  }
  // How long the request took separates "the user answered a prompt" from "the platform answered
  // without showing one", which the result alone cannot: both can come back "denied".
  report(`Permission: ${permission}`, permission === "granted",
    `was ${permissionBefore}, answered in ${Date.now() - askedAt}ms${permission === "denied" ? "; blocked on this device, recovery differs by platform" : ""}`);
  if (permission !== "granted") return fail("permission");

  const supported = await isSupported();
  report("Push supported in this context", supported, supported ? undefined : "iOS needs the Home Screen app over HTTPS, 16.4 or later");
  if (!supported) return fail("support");

  const registration = await ensurePushWorker(report);
  if (!registration) return fail("serviceWorker");

  // Same path the boot uses, so the foreground handlers get attached too — but with the worker
  // already active, getToken cannot lose the subscribe/activation race.
  const registered = await initialiseFirebaseMessaging({ userId });
  report("Token registered with the backend", registered, registered
    ? `deviceId ${notificationStore.getFirebaseDeviceId}`
    : String((lastInitialiseError as any)?.message || lastInitialiseError || "the backend refused the token or no token was issued"));
  if (!registered) return fail("registration");

  const verified = await isDeviceSetUp();
  report("Device verified end to end", verified, verified ? undefined : "permission, active worker or confirmed token is missing");
  if (!verified) return fail("verification");

  // Subscriptions are per device and the token enrols this device in nothing, so initialise joined
  // it to every topic the user has on. A topic it could not join is an order that will not reach
  // it, which is a failure of the setup, not a footnote.
  if (userId) {
    const sync = lastTopicSync;
    const failed = sync?.failed ?? [];
    report("This device joined the user's topics", !!sync && failed.length === 0, sync
      ? `${sync.joined.length + sync.rejoined.length} joined, ${sync.unchanged.length} already on, ${failed.length} failed`
      : "not attempted");
    if (!sync || failed.length) return fail("topics");
  }

  logger.warn("Notification setup on this device completed", steps);
  return { ok: true, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
}

export const firebaseUtil = {
  canInitialiseWithoutPrompting,
  requestNotificationPermissionFromGesture,
  isApplePushPlatform,
  initialiseFirebaseMessaging,
  isDeviceSetUp,
  getNotificationHealthIssue,
  setUpNotificationsOnThisDevice,
  syncDeviceTopicSubscriptions
}
