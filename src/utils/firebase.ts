import { DateTime } from "luxon"
import store from '@/store'

const storeClientRegistrationToken = async (registrationToken: string) => store.dispatch('user/storeClientRegistrationToken', registrationToken);

const addNotification = async (notification: any) => store.dispatch('user/addNotification', notification);

// device ID: <DDMMYY><timestamp[6]>
const generateDeviceId = () => (DateTime.now().toFormat('ddMMyy') + String(DateTime.now().toMillis()).slice(-6))

// topic name: oms-facilityId-enumId(enumCode)
const generateTopicName = (ofbizInstanceName: string, facilityId: string, enumId: string) => `${ofbizInstanceName}-${facilityId}-${enumId}`

export {
  addNotification,
  generateTopicName,
  generateDeviceId,
  storeClientRegistrationToken
}