import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getBaseUrl (state) {
        const url = state.instanceUrl
        return url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
    },
    getMaarg(state) {
        return state.maarg
    },
    getMaargUrl (state) {
        const url = state.maarg;
        return url.startsWith('http') ? url.includes('/rest/s1') ? url : `${url}/rest/s1/` : `https://${url}.hotwax.io/rest/s1/`;
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getCurrency (state) {
        return state.currentEComStore.defaultCurrencyUomId ? state.currentEComStore.defaultCurrencyUomId : 'USD';
    },
    getUserPermissions (state) {
        return state.permissions;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore;
    },
    getPartialOrderRejectionConfig(state) {
        return state.partialOrderRejectionConfig;
    },
    getNotifications(state) {
        return state.notifications.sort((a: any, b: any) => b.time - a.time)
    },
    getNotificationPrefs(state) {
        return state.notificationPrefs
    },
    getFirebaseDeviceId(state) {
        return state.firebaseDeviceId
    },
    getUnreadNotificationsStatus(state) {
        return state.hasUnreadNotifications
    },
    getAllNotificationPrefs(state) {
        return state.allNotificationPrefs
    },
    getBopisProductStoreSettings: (state) => (enumId: string) => {
        return state.bopisProductStoreSettings[enumId]
    },

}
export default getters;