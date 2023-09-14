import { DateTime } from "luxon"
import store from '@/store'

const storeClientRegistrationToken = async (registrationToken: string) => store.dispatch('user/storeClientRegistrationToken', registrationToken);

const addNotification = async (notification: any) => store.dispatch('user/addNotification', notification);

const generateDeviceId = () => {
  // device ID: <DDMMYY><timestamp[6]>
  return (DateTime.now().toFormat('ddMMyy') + String(DateTime.now().toMillis()).slice(-6))
}

const generateTopicName = (oms: string, facilityId: string, enumId: string) => {
  // topic name: oms-facilityId-enumId(enumCode)
  return `${oms}-${facilityId}-${enumId}`
}

export {
  addNotification,
  generateTopicName,
  generateDeviceId,
  storeClientRegistrationToken
}