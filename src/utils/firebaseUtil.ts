import { logger } from "@common";

/*
 * Browser-side helpers for push notifications: the permission prompt, the FCM push worker and the
 * locally recorded token. Pure of app state: no API calls and no stores (AGENTS.md, App layout).
 * Registration, setup and the health check live in useNotificationSetupStore.
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

export const firebaseUtil = {
  canInitialiseWithoutPrompting,
  requestNotificationPermissionFromGesture,
  isApplePushPlatform
}
