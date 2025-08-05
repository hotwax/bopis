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
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith("http") ? `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
    },
    getOmsBaseUrl (state) {
    const url = state.omsRedirectionUrl
    return url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
    },
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
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