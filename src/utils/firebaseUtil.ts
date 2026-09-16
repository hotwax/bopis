import { commonUtil, firebaseMessaging, translate, useNotificationStore } from "@common";
import { useNotificationHistoryStore } from "@/store/notificationHistory";

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
      async (notification: any) => {
        // History is owned by this app's IndexedDB store rather than the persisted `@common`
        // store, so that it is not wiped on logout.
        await useNotificationHistoryStore().addNotification(notification.notification);
        if (notification.isForeground) {
          commonUtil.showToast(translate("New notification received."));
        }
      }
    );
    notificationStore.isFirebaseInitialised = true;
  }
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}
