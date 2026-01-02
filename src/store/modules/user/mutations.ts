import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from './mutation-types'

const mutations: MutationTree <UserState> = {
    [types.USER_TOKEN_CHANGED] (state, payload) {
        state.token = payload.newToken
    },
    [types.USER_END_SESSION] (state) {
      state.token = ''
      state.current = {}
      state.permissions = []
      state.allNotificationPrefs = [],
      state.bopisProductStoreSettings = {}
    },
    [types.USER_INFO_UPDATED] (state, payload) {
        state.current = payload
    },
    [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
        state.instanceUrl = payload;
    },
    [types.USER_CURRENT_ECOM_STORE_UPDATED] (state, payload) {
        state.currentEComStore = payload
    },
    [types.USER_PERMISSIONS_UPDATED] (state, payload) {
        state.permissions = payload
    },
    [types.USER_PARTIAL_ORDER_REJECTION_CONFIG_UPDATED] (state, payload) {
        state.partialOrderRejectionConfig = payload
    },
    [types.USER_NOTIFICATIONS_UPDATED] (state, payload) {
        state.notifications = payload
    },
    [types.USER_NOTIFICATIONS_PREFERENCES_UPDATED] (state, payload) {
        state.notificationPrefs = payload
    },
    [types.USER_FIREBASE_DEVICEID_UPDATED] (state, payload) {
        state.firebaseDeviceId = payload
    },
    [types.USER_UNREAD_NOTIFICATIONS_STATUS_UPDATED] (state, payload) {
        state.hasUnreadNotifications = payload
    },
    [types.USER_ALL_NOTIFICATION_PREFS_UPDATED] (state, payload) {
        state.allNotificationPrefs = payload
    },
    [types.USER_BOPIS_PRODUCT_STORE_SETTINGS_UPDATED] (state, payload) {
        state.bopisProductStoreSettings = payload
    },
    [types.USER_OMS_REDIRECTION_URL_UPDATED](state, payload) {
        state.omsRedirectionUrl = payload;
    },
    [types.USER_APP_VERSION_UPDATED](state, payload) {
        state.appVersion = payload;
    }
}
export default mutations;