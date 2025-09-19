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
      instanceUrl: '',
      currentProductStore: {},
      partialOrderRejectionConfig: {},
      permissions: [],
      notifications: [],
      notificationPrefs: [],
      firebaseDeviceId: '',
      hasUnreadNotifications: true,
      allNotificationPrefs: [],
      bopisProductStoreSettings: {},
      omsRedirectionUrl: ""
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;