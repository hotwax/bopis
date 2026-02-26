import { defineStore } from 'pinia'
import { UserService } from '@/services/UserService'
import { UtilService } from '@/services/UtilService'
import { commonUtil } from '@/utils/commonUtil'
import {
  getNotificationEnumIds,
  getNotificationUserPrefTypeIds,
  hasError,
  logout,
  resetConfig,
  storeClientRegistrationToken,
  updateInstanceUrl,
  updateToken
} from '@/adapter'
import { DateTime, Settings } from 'luxon';
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { translate, useAuthStore, useProductIdentificationStore, useUserStore as useDxpUserStore } from '@hotwax/dxp-components'
import { fireBaseUtil } from '@/utils/fireBaseUtil'
import emitter from '@/event-bus'
import logger from '@/logger';

export const useUserStore = defineStore('appUser', {
  state: () => ({
    token: '',
    current: {} as any,
    instanceUrl: '',
    permissions: [] as any,
    currentEComStore: {} as any,
    partialOrderRejectionConfig: {} as any,
    notifications: [] as any,
    notificationPrefs: [] as any,
    firebaseDeviceId: '',
    hasUnreadNotifications: true,
    allNotificationPrefs: [] as any,
    bopisProductStoreSettings: {} as any,
    omsRedirectionUrl: ''
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isUserAuthenticated: (state) => !!(state.token && state.current),
    getBaseUrl: (state) => {
      let baseURL = process.env.VUE_APP_BASE_URL;
      if (!baseURL) baseURL = state.instanceUrl;
      return baseURL.startsWith("http") ? `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
    },
    getOmsBaseUrl: (state) => {
      const url = state.omsRedirectionUrl
      return url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
    },
    getMaargUrl: (state) => {
      const url = state.instanceUrl;
      return url.startsWith("http") ? `${url}` : `https://${url}.hotwax.io`;
    },
    getUserToken: (state) => state.token,
    getUserProfile: (state) => state.current,
    getInstanceUrl: (state) => {
      const baseUrl = process.env.VUE_APP_BASE_URL;
      return baseUrl ? baseUrl : state.instanceUrl;
    },
    getOmsRedirectionUrl: (state) => state.omsRedirectionUrl,
    getCurrency: (state) => state.currentEComStore.defaultCurrencyUomId ? state.currentEComStore.defaultCurrencyUomId : 'USD',
    getUserPermissions: (state) => state.permissions,
    getCurrentEComStore: (state) => state.currentEComStore,
    getPartialOrderRejectionConfig: (state) => state.partialOrderRejectionConfig,
    getNotifications: (state) => [...state.notifications].sort((a: any, b: any) => b.time - a.time),
    getNotificationPrefs: (state) => state.notificationPrefs,
    getFirebaseDeviceId: (state) => state.firebaseDeviceId,
    getUnreadNotificationsStatus: (state) => state.hasUnreadNotifications,
    getAllNotificationPrefs: (state) => state.allNotificationPrefs,
    getBopisProductStoreSettings: (state) => (enumId: string) => state.bopisProductStoreSettings[enumId],
    getCurrentFacility: () => useDxpUserStore().getCurrentFacility
  },
  actions: {
    async login(payload: any) {
      try {
        const { token, oms, omsRedirectionUrl } = payload;
        this.setUserInstanceUrl(oms);

        const permissionId = process.env.VUE_APP_PERMISSION_ID;
        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await UserService.getUserPermissions({
          permissionIds: [...new Set(serverPermissionsFromRules)]
        }, omsRedirectionUrl, token);
        const appPermissions = prepareAppPermissions(serverPermissions);

        if (permissionId) {
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
          if (!hasPermission) {
            const permissionError = 'You do not have permission to access the app.';
            commonUtil.showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        if (omsRedirectionUrl) {
          this.setOmsRedirectionUrl(omsRedirectionUrl)
        }

        const userProfile = await UserService.getUserProfile(token);
        userProfile.omsInstanceName = await UserService.fetchOmsInstanceName(token)

        const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_STOREFULFILLMENT_ADMIN");
        const facilities = await useDxpUserStore().getUserFacilities(userProfile?.partyId, "OMS_FULFILLMENT", isAdminUser)
        if (!facilities.length) throw "Unable to login. User is not associated with any facility"

        await useDxpUserStore().getFacilityPreference('SELECTED_FACILITY', userProfile.userId)
        userProfile.facilities = facilities;

        userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
          if (uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
          else uniqueFacilities.push(facility.facilityId);
          return uniqueFacilities
        }, []);

        const currentEComStore = await UserService.getCurrentEComStore(token, commonUtil.getCurrentFacilityId());

        updateToken(token)

        this.current = userProfile;
        await useDxpUserStore().setEComStorePreference(currentEComStore);

        setPermissions(appPermissions);
        if (userProfile.timeZone) {
          Settings.defaultZone = userProfile.timeZone;
        }

        this.currentEComStore = currentEComStore;
        this.permissions = appPermissions;
        this.token = token;

        await useProductIdentificationStore().getIdentificationPref(currentEComStore?.productStoreId)

        await this.fetchPartialOrderRejectionConfig();
        await this.fetchAllNotificationPrefs();
        await this.fetchBopisProductStoreSettings();

      } catch (err: any) {
        commonUtil.showToast(translate('Something went wrong while login. Please contact administrator'));
        logger.error("error", err);
        return Promise.reject(err instanceof Object ? err : new Error(err))
      }
    },
    async logout(payload?: any) {
      let redirectionUrl = ''
      emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

      if (!payload?.isUserUnauthorised) {
        let resp;
        try {
          resp = await logout();
          resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
        } catch (err) {
          logger.error('Error parsing data', err)
        }

        if (resp?.logoutAuthType == 'SAML2SSO') {
          redirectionUrl = resp.logoutUrl
        }
      }

      const authStore = useAuthStore()
      const dxpUserStore = useDxpUserStore()
      const productIdentificationStore = useProductIdentificationStore();

      this.$reset();

      this.setOmsRedirectionUrl("")
      resetPermissions();
      resetConfig();

      authStore.$reset()
      dxpUserStore.$reset()
      productIdentificationStore.$reset()

      if (redirectionUrl) {
        window.location.href = redirectionUrl
      }

      emitter.emit('dismissLoader')
      return redirectionUrl;
    },
    setOmsRedirectionUrl(payload: string) {
      this.omsRedirectionUrl = payload;
    },
    async setFacility(facilityId: string) {
      const token = this.token;

      const previousEComStore = await useDxpUserStore().getCurrentEComStore as any
      const eComStore = await UserService.getCurrentEComStore(token, facilityId);

      if (previousEComStore.productStoreId !== eComStore.productStoreId) {
        await useDxpUserStore().setEComStorePreference(eComStore);
        this.currentEComStore = eComStore;
        await this.fetchPartialOrderRejectionConfig();
        await this.fetchBopisProductStoreSettings();
        await useProductIdentificationStore().getIdentificationPref(eComStore?.productStoreId)
      }
    },
    setUserInstanceUrl(instanceUrl: string) {
      this.instanceUrl = instanceUrl;
      updateInstanceUrl(instanceUrl)
    },
    async setUserTimeZone(timeZoneId: string) {
      const current = this.current;
      try {
        await UserService.setUserTimeZone(({ userId: current.userId, timeZone: timeZoneId }));
        current.timeZone = timeZoneId;
        this.current = { ...current };
        Settings.defaultZone = current.timeZone;
        commonUtil.showToast(translate("Time zone updated successfully"));
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Failed to update time zone"));
      }
    },
    async fetchPartialOrderRejectionConfig() {
      let config = {};
      const params = {
        "inputFields": {
          "productStoreId": this.currentEComStore.productStoreId,
          "settingTypeEnumId": "BOPIS_PART_ODR_REJ"
        },
        "entityName": "ProductStoreSetting",
        "fieldList": ["productStoreId", "settingTypeEnumId", "settingValue"],
        "viewSize": 1
      } as any

      try {
        const resp = await UserService.getPartialOrderRejectionConfig(params)
        if (resp.status === 200 && !hasError(resp) && resp.data?.docs) {
          config = resp.data?.docs[0];
        } else {
          logger.error('Failed to fetch partial order rejection configuration');
        }
      } catch (err) {
        logger.error(err);
      }
      this.partialOrderRejectionConfig = config;
    },
    async updatePartialOrderRejectionConfig(payload: any) {
      let resp = {} as any;
      try {
        if (!await UtilService.isEnumExists("BOPIS_PART_ODR_REJ")) {
          resp = await UtilService.createEnumeration({
            "enumId": "BOPIS_PART_ODR_REJ",
            "enumTypeId": "PROD_STR_STNG",
            "description": "BOPIS Partial Order Rejection",
            "enumName": "BOPIS Partial Order Rejection",
            "enumCode": "BOPIS_PART_ODR_REJ"
          })

          if (hasError(resp)) {
            throw resp.data;
          }
        }

        if (!payload.settingTypeEnumId) {
          payload = {
            ...payload,
            "productStoreId": this.currentEComStore.productStoreId,
            "settingTypeEnumId": "BOPIS_PART_ODR_REJ"
          }
          resp = await UserService.createPartialOrderRejectionConfig(payload) as any
        } else {
          resp = await UserService.updatePartialOrderRejectionConfig(payload) as any
        }

        if (!hasError(resp)) {
          commonUtil.showToast(translate('Configuration updated'))
        } else {
          commonUtil.showToast(translate('Failed to update configuration'))
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update configuration'))
        logger.error(err)
      }
      await this.fetchPartialOrderRejectionConfig();
    },
    addNotification(payload: any) {
      this.notifications.push({ ...payload.notification, time: DateTime.now().toMillis() })
      this.hasUnreadNotifications = true;
      if (payload.isForeground) {
        commonUtil.showToast(translate("New notification received."));
      }
    },
    async fetchNotificationPreferences() {
      let resp = {} as any
      let notificationPreferences = [], enumerationResp = [], userPrefIds = [] as any

      try {
        resp = await getNotificationEnumIds(process.env.VUE_APP_NOTIF_ENUM_TYPE_ID)
        enumerationResp = resp
        resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, this.current.userId, {
          "topic": commonUtil.getCurrentFacilityId(),
          "topic_op": "contains"
        })
        userPrefIds = resp.map((userPref: any) => userPref.topic)
      } catch (error) {
        logger.error(error)
      } finally {
        if (enumerationResp?.length) {
          notificationPreferences = enumerationResp.reduce((notifactionPref: any, pref: any) => {
            const userPrefTypeIdToSearch = fireBaseUtil.generateTopicName(commonUtil.getCurrentFacilityId(), pref.enumId)
            notifactionPref.push({ ...pref, isEnabled: userPrefIds.includes(userPrefTypeIdToSearch) })
            return notifactionPref
          }, [])
        }
        this.notificationPrefs = notificationPreferences;
      }
    },
    async fetchAllNotificationPrefs() {
      let allNotificationPrefs = [];
      try {
        const resp = await getNotificationUserPrefTypeIds(process.env.VUE_APP_NOTIF_APP_ID, this.current.userId, {
          "topic": commonUtil.getCurrentFacilityId(),
          "topic_op": "contains"
        })
        allNotificationPrefs = resp
      } catch (error) {
        logger.error(error)
      }
      this.allNotificationPrefs = allNotificationPrefs;
    },
    async fetchBopisProductStoreSettings() {
      const productStoreSettings = JSON.parse(process.env.VUE_APP_PRODUCT_STORE_SETTING_ENUMS);
      const settingValues = {} as any;

      const payload = {
        "inputFields": {
          "productStoreId": this.currentEComStore.productStoreId,
          "settingTypeEnumId": Object.keys(productStoreSettings),
          "settingTypeEnumId_op": "in"
        },
        "entityName": "ProductStoreSetting",
        "fieldList": ["settingTypeEnumId", "settingValue"]
      }

      try {
        const resp = await UtilService.getProductStoreSettings(payload) as any
        if (!hasError(resp)) {
          resp.data.docs.map((setting: any) => {
            settingValues[setting.settingTypeEnumId] = setting.settingValue === "true"
          })
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err)
      }

      const missingSettings = Object.keys(productStoreSettings).filter((settingTypeEnumId) => !Object.keys(settingValues).includes(settingTypeEnumId));
      missingSettings.map((settingTypeEnumId: any) => settingValues[settingTypeEnumId] = false)
      this.bopisProductStoreSettings = settingValues;
    },
    async createProductStoreSetting(enumeration: any) {
      try {
        if (!await UtilService.isEnumExists(enumeration.enumId)) {
          const resp = await UtilService.createEnumeration({
            "enumId": enumeration.enumId,
            "enumTypeId": "PROD_STR_STNG",
            "description": enumeration.description,
            "enumName": enumeration.enumName
          })

          if (hasError(resp)) {
            throw resp.data;
          }
        }

        const params = {
          "productStoreId": this.currentEComStore.productStoreId,
          "settingTypeEnumId": enumeration.enumId,
          "settingValue": "false"
        }

        await UtilService.createProductStoreSetting(params) as any
        return true;
      } catch (err) {
        logger.error(err)
      }

      return false;
    },
    async setProductStoreSetting(payload: any) {
      let prefValue = this.bopisProductStoreSettings[payload.enumId]
      const eComStoreId = this.currentEComStore.productStoreId;

      if (!eComStoreId) {
        commonUtil.showToast(translate("Unable to update product store setting."))
        return;
      }

      try {
        let resp = await UtilService.getProductStoreSettings({
          "inputFields": {
            "productStoreId": this.currentEComStore.productStoreId,
            "settingTypeEnumId": payload.enumId
          },
          "entityName": "ProductStoreSetting",
          "fieldList": ["settingTypeEnumId"],
          "viewSize": 1
        }) as any
        if (!hasError(resp) && resp.data.docs[0]?.settingTypeEnumId) {
          const params = {
            "productStoreId": eComStoreId,
            "settingTypeEnumId": payload.enumId,
            "settingValue": `${payload.value}`
          }

          resp = await UtilService.updateProductStoreSetting(params) as any
          if ((!hasError(resp))) {
            prefValue = payload.value
          } else {
            throw resp.data;
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        commonUtil.showToast(translate("Failed to update product store setting."))
        logger.error(err)
      }

      this.bopisProductStoreSettings = { ...this.bopisProductStoreSettings, [payload.enumId]: prefValue };
    },
    updateNotificationPreferences(payload: any) {
      this.notificationPrefs = payload;
    },
    async storeClientRegistrationToken(registrationToken: string) {
      const firebaseDeviceId = fireBaseUtil.generateDeviceId()
      this.firebaseDeviceId = firebaseDeviceId;

      try {
        await storeClientRegistrationToken(registrationToken, firebaseDeviceId, process.env.VUE_APP_NOTIF_APP_ID)
      } catch (error) {
        logger.error(error)
      }
    },
    clearNotificationState() {
      this.notifications = [];
      this.notificationPrefs = [];
      this.hasUnreadNotifications = true;
    },
    clearDeviceId() {
      this.firebaseDeviceId = '';
    },
    setUnreadNotificationsStatus(payload: boolean) {
      this.hasUnreadNotifications = payload
    },
    clearPartialOrderRejectionConfig() {
      this.partialOrderRejectionConfig = {};
    }
  },
  persist: true
})
