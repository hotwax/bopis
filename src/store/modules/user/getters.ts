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
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getCurrentFacility (state){
        return state.currentFacility
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    showShippingOrders (state) {
        return state.preference.showShippingOrders;
    },
    configurePicker (state) {
        return state.preference.configurePicker;
    },
    showPackingSlip (state) {
        return state.preference.showPackingSlip;
    },
    getLocale (state) {
        return state.locale;
    },
    getCurrency (state) {
        return state.currentEComStore.defaultCurrencyUomId ? state.currentEComStore.defaultCurrencyUomId : 'USD';
    }
}
export default getters;