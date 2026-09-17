import { firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";

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

const initialiseFirebaseMessaging = async () => {
  logger.warn('Initializing firebase')
  const notificationStore = useNotificationStore();

  // if (notificationStore.isFirebaseInitialised) return;

  const appFirebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (appFirebaseConfig && appFirebaseConfig.apiKey) {
    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        await notificationStore.storeClientRegistrationToken(token, firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId), import.meta.env.VITE_NOTIF_APP_ID);
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
  canInitialiseWithoutPrompting,
  initialiseFirebaseMessaging
}
