import { firebaseMessaging, useNotificationStore } from "@common";
import { DateTime } from "luxon";

const initialiseFirebaseMessaging = async () => {
  const notificationStore = useNotificationStore();
  if (notificationStore.isFirebaseInitialised) return;

  const appFirebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (appFirebaseConfig && appFirebaseConfig.apiKey && notificationStore.getAllNotificationPrefs?.length) {
    await firebaseMessaging.initialiseFirebaseApp(
      appFirebaseConfig,
      appFirebaseVapidKey,
      async (token: string) => {
        await notificationStore.storeClientRegistrationToken(token, firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId), import.meta.env.VITE_NOTIF_APP_ID);
      },
      (notification: any) => {
        notificationStore.addNotification({...notification.notification, isForeground: notification.isForeground, time: DateTime.now().toMillis()});
      }
    );
    notificationStore.isFirebaseInitialised = true;
  }
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}
