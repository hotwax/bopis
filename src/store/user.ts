import { api, i18n, commonUtil, cookieHelper, logger, translate, useNotificationStore, firebaseUtil, useEmbeddedAppStore } from "@common";
import { defineStore } from "pinia"
import { DateTime, Settings } from "luxon"
import { useAuth } from "@common/composables/auth";
import router from "@/router";
import { useProductStore as useProduct } from "@/store/product";
import { useOrderStore } from "@/store/order";
import { useStockStore } from "@/store/stock";
import { useProductStore } from "@/store/productStore";

interface UserState {
  permissions: any[]
  current: any
  pwaState: {
    updateExists: boolean
    registration: any
  }
  timeZones: any[],
  localeOptions: any,
  locale: string,
  oms: any
}

export const useUserStore = defineStore("user", {
  state: (): UserState => ({
    permissions: [],
    current: {},
    pwaState: {
      updateExists: false,
      registration: null
    },
    timeZones: [],
    localeOptions: import.meta.env.VITE_LOCALES ? JSON.parse(import.meta.env.VITE_LOCALES) : { "en-US": "English" },
    locale: 'en-US',
    oms: ""
  }),
  getters: {
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.current.timeZone,
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getUserPermissions(state: UserState) {
      return state.permissions
    },
    getUserProfile(state: UserState) {
      return state.current
    },
    getPwaState(state: UserState) {
      return state.pwaState
    },
    getCurrency(state: UserState) {
      return state.current.currency
    },
    hasPermission: (state: UserState) => (permissionId: string): boolean => {
      const permissions = state.permissions;

      if (!permissionId) {
        return true;
      }

      // Handle OR/AND logic in permission string
      if (permissionId.includes(' OR ')) {
        const parts = permissionId.split(' OR ');
        return parts.some(part => useUserStore().hasPermission(part.trim()));
      }

      if (permissionId.includes(' AND ')) {
        const parts = permissionId.split(' AND ');
        return parts.every(part => useUserStore().hasPermission(part.trim()));
      }

      return permissions.includes(permissionId);
    }
  },
  actions: {
    updateUserInfo(payload: any) {
      this.current = { ...this.current, ...payload }
    },
    setPermissionsState(payload: any) {
      this.permissions = payload
    },
    setPwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    },
    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
        }) as any;
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }
      } catch (error: any) {
        commonUtil.showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID;
      const serverPermissions = [] as any;

      // TODO Make it configurable from the environment variables.
      // Though this might not be an server specific configuration, 
      // we will be adding it to environment variable for easy configuration at app level
      const viewSize = 50;

      let viewIndex = 0;

      try {
        let resp;
        do {
          resp = await api({
            url: "getPermissions",
            method: "post",
            baseURL: commonUtil.getOmsURL(),
            data: { viewIndex, viewSize }
          }) as any

          if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId));
            viewIndex++;
          } else {
            resp = null;
          }
        } while (resp);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasAppPermission = serverPermissions.includes(permissionId);
          if (!hasAppPermission) {
            const permissionError = "You do not have permission to access the app.";
            commonUtil.showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = serverPermissions;
      } catch (error: any) {
        return Promise.reject(error);
      }
    },

    async setUserTimeZone(tzId: string) {
      try {
        await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: this.current.userId, timeZone: tzId },
        });
        this.updateUserInfo({ userTimeZone: tzId })
        this.current.timeZone = tzId
      } catch (error: any) {
        console.error("Failed to set user time zone", error);
        commonUtil.showToast(translate("Failed to set user time zone"));
      }
    },

    async getAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if (this.timeZones.length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        }) as any;
        if (resp.status === 200 && !commonUtil.hasError(resp)) {
          this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
        }
      } catch (err) {
        console.error('Error', err)
      }
    },

    async setLocale(locale: string) {
      let newLocale = this.locale;
      let matchingLocale: string | undefined;

      try {
        const userProfile = this.current
        if (locale) {
          matchingLocale = Object.keys(this.localeOptions).find((option: string) => option === locale)
          // If exact locale is not found, try to match the first two characters i.e primary code
          matchingLocale = matchingLocale || Object.keys(this.localeOptions).find((option: string) => option.slice(0, 2) === locale.slice(0, 2))
          newLocale = matchingLocale || this.locale
          // update locale in state and globally
          await api({
            url: "admin/user/profile",
            method: "POST",
            data: {
              userId: userProfile.userId,
              locale: newLocale
            },
          });
        }
      } catch (error) {
        console.error(error)
      } finally {
        i18n.global.locale.value = newLocale as any
        this.locale = newLocale
      }
    },
    setUnreadNotificationsStatus(payload: any) {
      this.pwaState.updateExists = payload
    },
    async postLogin() {
      try {
        await this.fetchPermissions()
        await this.fetchUserProfile()
        await useProductStore().fetchUserFacilities()
        await useProductStore().fetchFacilityPreference();
        await useProductStore().fetchProductStores()
        await useProductStore().fetchProductStorePreference();
        await useProductStore().fetchProductStoreDependencies(useProductStore().getCurrentProductStore.productStoreId)

        const notificationStore = useNotificationStore();
        await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID as any, this.current.userId)
        await firebaseUtil.initialiseFirebaseMessaging();

        const facilityId = router.currentRoute.value.query.facilityId
        if (facilityId) {
          const facility = this.current.facilities.find((facility: any) => facility.facilityId === facilityId);
          if (facility) {
            useProductStore().currentFacility = facility
          } else {
            commonUtil.showToast(translate("Redirecting to home page due to incorrect information being passed."))
          }
        }
      } catch (error: any) {
        return Promise.reject(error);
      }
    },
    async postLogout() {
      try {
        if (useNotificationStore().getFirebaseDeviceId) await useNotificationStore().removeClientRegistrationToken(useNotificationStore().getFirebaseDeviceId, import.meta.env.VITE_NOTIF_APP_ID as any)
      } catch (error) {
        logger.error(error)
      }

      if (commonUtil.isAppEmbedded()) {
        setTimeout(() => {
          window.location.href = window.location.origin + `/shopify-login?shop=${useEmbeddedAppStore().getShop}&host=${useEmbeddedAppStore().getHost}&embedded=1`;
        }, 100);
        useEmbeddedAppStore().$reset();
      }

      useNotificationStore().clearNotificationState();
      this.$reset();
      useOrderStore().$reset();
      useProductStore().$reset();
      useProduct().$reset();
      useStockStore().$reset();
    }
  },
  persist: true
})
