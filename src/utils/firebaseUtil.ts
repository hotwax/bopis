import { firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";

const initialiseFirebaseMessaging = async () => {
  logger.warn('Initializing firebase')
  const notificationStore = useNotificationStore();

  // if (notificationStore.isFirebaseInitialised) return;

  // An unset or malformed config used to throw here, and the rejection propagated out of the
  // post-login flow rather than degrading to notifications being unavailable.
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
  initialiseFirebaseMessaging
}
