import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: '',
      current: {},
      currentFacility: {},
      instanceUrl: '',
      preference: {
        showShippingOrders: false,
        showPackingSlip: false,
        configurePicker: false,
        printPicklistPref: false
      },
      currentEComStore: {},
      partialOrderRejectionConfig: {},
      permissions: [],
      notifications: [],
      notificationPrefs: [],
      firebaseDeviceId: '',
      hasUnreadNotifications: true,
      allNotificationPrefs: []
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;