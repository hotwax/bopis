import { DateTime } from "luxon"
import store from '@/store'

const storeClientRegistrationToken = async (registrationToken: string) => store.dispatch('user/storeClientRegistrationToken', registrationToken);

const addNotification = async (notification: any) => store.dispatch('user/addNotification', notification);

// device ID: <DDMMYY><timestamp[6]>
const generateDeviceId = () => {
  const deviceId = store.getters['user/getFirebaseDeviceId'];
  return deviceId ? deviceId : (DateTime.now().toFormat('ddMMyy') + String(DateTime.now().toMillis()).slice(-6))
}

// topic name: oms-facilityId-enumId(enumCode)
const generateTopicName = (facilityId: string, enumId: string) => {
  const userProfile = store.getters['user/getUserProfile'];
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

export {
  addNotification,
  generateTopicName,
  generateDeviceId,
  isFcmConfigured,
  storeClientRegistrationToken
}