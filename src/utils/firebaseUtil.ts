import { commonUtil, firebaseMessaging, translate, useNotificationStore } from "@common";
import { useNotificationHistoryStore } from "@/store/notificationHistory";
import router from "@/router";

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
  await commonUtil.showToast(buildToastMessage(payload), {
    canDismiss: true,
    buttons: [{
      text: translate("View"),
      handler: () => {
        // Which order the message is about is not in the payload, so the bell page is as specific
        // as this can get.
        if (router.currentRoute.value.path !== NOTIFICATIONS_PATH) router.push({ path: NOTIFICATIONS_PATH });
      }
    }]
  });
}

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
        // Background messages already surface through the service worker's system notification.
        if (notification.isForeground) {
          await showNotificationToast(notification.notification);
        }
      }
    );
    notificationStore.isFirebaseInitialised = true;
  }
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}
