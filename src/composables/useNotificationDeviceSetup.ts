import { logger, useNotificationStore } from "@common";
import { isSupported } from "firebase/messaging";
import {
  type DeviceSetupResult, type DeviceSetupStep, type DeviceSetupStepResult, type NotificationHealthIssue, type StepReporter,
  ensurePushWorker, findPushWorkerRegistration, getLastInitialiseError, initialiseFirebaseMessaging, readRegisteredToken
} from "@/utils/firebaseUtil";

/*
 * Setting up push on this device from the screens: the Enable chain run from a tap, and the checks
 * the settings card reads. Token registration and the Firebase listeners are in firebaseUtil, which
 * login needs as well.
 */
export function useNotificationDeviceSetup() {
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
      : getLastInitialiseError() || "the backend refused the token or no token was issued");
    if (!registered) return fail("registration");

    const verified = await isDeviceSetUp();
    report("Device verified end to end", verified, verified ? undefined : "permission, active worker or confirmed token is missing");
    if (!verified) return fail("verification");

    logger.warn("Notification setup on this device completed", steps);
    return { ok: true, permission: permissionNow(), deviceId: notificationStore.getFirebaseDeviceId, steps };
  }

  return { isDeviceSetUp, getNotificationHealthIssue, setUpNotificationsOnThisDevice };
}
