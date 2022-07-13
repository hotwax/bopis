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
          const user = await dispatch('getProfile', { token: resp.data.token });

          // If the user is not associated with any facility we will consider that the user does not have permission to access this app.
          if (user.data.facilities?.length > 0) {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token });
            await dispatch('getEComStores', { facilityId: user.data.facilities[0]?.facilityId })
            return resp.data;
          } else {
            //TODO need to improve this message
            //this message will be displayed when user is not associated with any facility
            showToast(translate('You do not have permission to login into this app.'));
            return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
          }
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
  async getProfile({ commit }, payload) {
    const resp = await UserService.getProfile(payload)
    if (resp.status === 200 && resp.data.facilities?.length > 0) {
      const localTimeZone = moment.tz.guess();
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }
      try {
        const userPreferenceResp = await UserService.getUserPreference({
          'userPrefTypeId': 'BOPIS_PREFERENCE'
        });

        if (userPreferenceResp.status == 200 && !hasError(userPreferenceResp) && userPreferenceResp.data?.userPrefValue) {
          const userPreference = JSON.parse(userPreferenceResp.data.userPrefValue)
          commit(types.USER_PREFERENCE_UPDATED, userPreference)
        }
      } catch (err) {
        console.error(err)
      }
      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
    return resp;
  },

  /**
   *  update current eComStore information
  */ 
  async setEComStore({ commit, dispatch }, payload) {
    // clearing the orders state whenever changing the eComStore/Shop
    dispatch('order/clearOrders', null, {root: true});
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    await UserService.setUserPreference({
      'userPrefTypeId': 'SELECTED_BRAND',
      'userPrefValue': payload.eComStore.productStoreId
    });
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit, dispatch }, payload) {
    // clearing the orders state whenever changing the facility
    dispatch("order/clearOrders", null, {root: true})
    await dispatch("getEComStores", { facilityId: payload.facility.facilityId })
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },
  /**
   * Set User Instance Url
   */
   setUserInstanceUrl ({ commit }, instanceUrl){
    commit(types.USER_INSTANCE_URL_UPDATED, instanceUrl)
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

  setUserPreference( {state, commit }, payload){
    commit(types.USER_PREFERENCE_UPDATED, payload)
    UserService.setUserPreference({
      'userPrefTypeId': 'BOPIS_PREFERENCE',
      'userPrefValue': JSON.stringify(state.preference)
    });
  },
  
  async getEComStores({ state, commit, dispatch }, payload) {
    let resp;

    try {
      const param = {
        "inputFields": {
          "facilityId": payload.facilityId,
          "storeName_op": "not-empty"
        },
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStore",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      resp = await UserService.getEComStores(param);
      if(resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        const user = state.current as any;
        const userPref =  await UserService.getUserPreference({
          'userPrefTypeId': 'SELECTED_BRAND'
        });
        
        user.stores = [{
          productStoreId: '',
          storeName: 'None'
        }, ...(resp.data.docs ? resp.data.docs : [])]
        
        commit(types.USER_INFO_UPDATED, user);
        const userPrefStore = user.stores.find((store: any) => store.productStoreId == userPref.data.userPrefValue)
        dispatch('setEComStore', { eComStore: userPrefStore? userPrefStore: user.stores.length > 0 ? user.stores[0] : {} });

        return user.stores
      }
    } catch(error) {
      console.error(error);
    }
    return []
  }
}
export default actions;