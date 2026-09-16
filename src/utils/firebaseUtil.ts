import { firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";

const initialiseFirebaseMessaging = async () => {
  console.log('Initializing firebase')
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
  initialiseFirebaseMessaging
}
