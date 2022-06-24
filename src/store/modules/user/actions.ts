import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import moment from 'moment';
import emitter from '@/event-bus'
import "moment-timezone";

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, { username, password }) {
    try {
      const resp = await UserService.login(username, password)
      if (resp.status === 200 && resp.data) {
        if (resp.data.token) {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            await dispatch('getProfile')
            return resp.data;
        } else if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
    // return resp
  },

  /**
   * Logout user
   */
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
  },

  /**
   * Get User profile
   */
  async getProfile ( { commit, dispatch }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const localTimeZone = moment.tz.guess();
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }
      const userShippingOrderPreferenceResp = await UserService.getShippingOrderPreference({
        'userPrefTypeId': 'BOPIS_PREFERENCE'
      });

      if (userShippingOrderPreferenceResp.status == 200 && userShippingOrderPreferenceResp.data?.userPrefValue && !hasError(userShippingOrderPreferenceResp)) {
        const userShippingOrderPreferenceValue = JSON.parse(userShippingOrderPreferenceResp.data.userPrefValue)
        commit(types.USER_SHIPPING_ORDERS_STATUS_UPDATED, userShippingOrderPreferenceValue.shippingOrderStatus)
      }
      
      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
    return resp;
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch }, payload) {
    // clearing the orders state whenever changing the facility
    dispatch("order/clearOrders", null, {root: true})
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },
  /**
   * Set User Instance Url
   */
   setUserInstanceUrl ({ state, commit }, instanceUrl){
    commit(types.USER_INSTANCE_URL_UPDATED, instanceUrl)
    const packingSlipEnabledDomain = JSON.parse(process.env.VUE_APP_PACKING_SLP_ENBLD_DMN);
    const packingSlipEnabled = packingSlipEnabledDomain.some((domain: string) => domain === instanceUrl)
    commit(types.USER_PACKING_SLIP_ENABLED_UPDATED, packingSlipEnabled)
   },
  
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.tzId;
      commit(types.USER_INFO_UPDATED, current);
      showToast(translate("Time zone updated successfully"));
    }
  },

  setShippingOrdersStatus( {state, commit }, payload){
    UserService.setShippingOrderPreference({
      'userPrefTypeId': 'BOPIS_PREFERENCE',
      'userPrefValue': JSON.stringify({shippingOrderStatus: payload})
    });
    commit(types.USER_SHIPPING_ORDERS_STATUS_UPDATED, payload)
  }
}
export default actions;