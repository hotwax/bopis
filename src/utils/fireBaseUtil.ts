import { DateTime } from "luxon"
import { useUserStore } from '@/store/user'

const storeClientRegistrationToken = async (registrationToken: string) => useUserStore().storeClientRegistrationToken(registrationToken);

const addNotification = async (notification: any) => useUserStore().addNotification(notification);

// device ID: <DDMMYY><timestamp[6]>
const generateDeviceId = () => {
  const deviceId = useUserStore().getFirebaseDeviceId;
  return deviceId ? deviceId : (DateTime.now().toFormat('ddMMyy') + String(DateTime.now().toMillis()).slice(-6))
}

// topic name: oms-facilityId-enumId(enumCode)
const generateTopicName = (facilityId: string, enumId: string) => {
  const userProfile = useUserStore().getUserProfile;
  return `${userProfile.omsInstanceName}-${facilityId}-${enumId}`;
};

//Checking if firebase cloud messaging is configured.
const isFcmConfigured = () => {
  try {
    const config = JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG as any);
    return !!(config && config.apiKey);
  } catch (e) {
    return false;
  }
}

export const fireBaseUtil = {
  addNotification,
  generateTopicName,
  generateDeviceId,
  isFcmConfigured,
  storeClientRegistrationToken
}