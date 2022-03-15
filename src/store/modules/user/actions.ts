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
  async getProfile ({ dispatch, commit }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const localTimeZone = moment.tz.guess();
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }

      dispatch('getEComStores', { facilityId: resp.data.facilities[0].facilityId })

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
    dispatch("getEComStores", { facilityId: payload.facility.facilityId })
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },
  /**
   * Set User Instance Url
   */
   setUserInstanceUrl ({ state, commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
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
    commit(types.USER_SHIPPING_ORDERS_STATUS_UPDATED, payload)
  },

  async getEComStores({ commit }, payload) {
    let resp;

    const params = {
      "inputFields": {
        "facilityId": payload.facilityId
      },
      "fieldList": [ "reserveInventory", "productStoreId", "storeName" ],
      "entityName": "ProductStoreAndFacility",
      "distinct": "Y",
      "noConditionFind": "Y"
    }

    try{
      resp = await UserService.getEComStores(params);
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        const stores = resp.data.docs
        stores.map((store: any) => {
          store.reserveInventory = store.reserveInventory !== "N";
        })

        commit(types.USER_ECOM_STORE_UPDATED, stores?.length > 0 ?  stores : {});
        commit(types.USER_CURRENT_ECOM_STORE_UPDATED, stores?.length > 0 ? stores[0] : {});

        return stores
      }
    } catch(err) {
      console.error(err)
    }
  },

  async setEComStore({ commit, dispatch }, payload) {
    dispatch("order/clearOrders", null, { root: true })
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.store);
  }
}
export default actions;