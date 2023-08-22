import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import i18n, { translate } from '@/i18n'
import { Settings } from 'luxon';
import { hasError, updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { useProductIdentificationStore, useAuthStore } from '@hotwax/dxp-components'

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, payload) {
    try {
      const {token, oms} = payload;
      dispatch("setUserInstanceUrl", oms);

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: serverPermissionsFromRules
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermissionId: any) => appPermissionId === permissionId);
        // If there are any errors or permission check fails do not allow user to login
        if (hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          console.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);

      // removing duplicate records as a single user can be associated with a facility by multiple roles.
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if (uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);
      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentFacility = userProfile.facilities.length > 0 ? userProfile.facilities[0] : {};
      const currentEComStore = await UserService.getCurrentEComStore(token, currentFacility?.facilityId);
      const userPreference = await UserService.getUserPreference(token);

      /*  ---- Guard clauses ends here --- */
      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore)
      commit(types.USER_PREFERENCE_UPDATED, userPreference)
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Get product identification from api using dxp-component and set the state if eComStore is defined
      if(currentEComStore.productStoreId){
        await useProductIdentificationStore().getIdentificationPref(currentEComStore.productStoreId);
      }
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit, dispatch }) {
    const authStore = useAuthStore()
    // TODO add any other tasks if need
    dispatch("product/clearProducts", null, { root: true })
    commit(types.USER_END_SESSION)
    resetPermissions();
    resetConfig();

    // reset plugin state on logout
    authStore.$reset()
  },

  /**
   * update current facility information
   */
  async setFacility({ commit, dispatch, state }, payload) {
    let facility = payload.facility;
    if (!facility && state.current?.facilities) {
      facility = state.current.facilities.find((facility: any) => facility.facilityId === payload.facilityId);
    }
    // clearing the orders state whenever changing the facility
    dispatch("order/clearOrders", null, { root: true })
    dispatch("product/clearProducts", null, { root: true })
    commit(types.USER_CURRENT_FACILITY_UPDATED, facility);
    const eComStore = await UserService.getCurrentEComStore(undefined, facility?.facilityId);
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore);

    // Get product identification from api using dxp-component and set the state if eComStore is defined
    if(eComStore.productStoreId){
      await useProductIdentificationStore().getIdentificationPref(eComStore.productStoreId);
    }
  },
  /**
   * Set User Instance Url
   */
  setUserInstanceUrl({ commit }, instanceUrl) {
    commit(types.USER_INSTANCE_URL_UPDATED, instanceUrl)
    updateInstanceUrl(instanceUrl)
  },

  /**
   * Update user timeZone
   */
  async setUserTimeZone({ state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.timeZoneId;
      commit(types.USER_INFO_UPDATED, current);
      Settings.defaultZone = current.userTimeZone;
      showToast(translate("Time zone updated successfully"));
    }
  },

  setUserPreference({ state, commit }, payload) {
    commit(types.USER_PREFERENCE_UPDATED, payload)
    UserService.setUserPreference({
      'userPrefTypeId': 'BOPIS_PREFERENCE',
      'userPrefValue': JSON.stringify(state.preference)
    });
  },

  setLocale({ commit }, payload) {
    i18n.global.locale = payload
    commit(types.USER_LOCALE_UPDATED, payload)
  },
}
export default actions;