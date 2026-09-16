import { firebaseMessaging, logger, useNotificationStore } from "@common";
import { DateTime } from "luxon";

const parseFirebaseConfig = () => {
  try {
    const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
    return rawConfig ? JSON.parse(rawConfig as any) : null;
  } catch (error) {
    // An unset or malformed config used to throw here and reject the whole post-login flow.
    logger.error("Firebase config is not valid JSON", error);
    return null;
  }
};

/**
 * Registers this device with Firebase and stores the resulting token on the backend.
 *
 * @param force subscribe-time callers pass true. By default the device is only registered
 *   for users who already hold a topic subscription, so that users who never asked for
 *   notifications are not prompted on login. That default makes a user's very first
 *   subscription impossible to register, so the caller that is about to subscribe must
 *   override it.
 * @returns whether this device now has a registration token.
 */
const initialiseFirebaseMessaging = async (force = false) => {
  const notificationStore = useNotificationStore();
  if (notificationStore.isFirebaseInitialised) return !!notificationStore.getFirebaseDeviceId;

  const appFirebaseConfig = parseFirebaseConfig();
  const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!appFirebaseConfig?.apiKey) return false;
  if (!force && !notificationStore.getAllNotificationPrefs?.length) return false;

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
  return !!notificationStore.getFirebaseDeviceId;
}

export const firebaseUtil = {
  initialiseFirebaseMessaging
}