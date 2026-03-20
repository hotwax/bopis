import { defineStore } from 'pinia'
import { api, commonUtil, logger, translate } from '@common'
import { useUserStore } from '@/store/user'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    currentFacility: {
      facilityId: "",
      facilityName: "",
      productStores: []
    } as any,
    currentEComStore: {} as any,
    settings: {
      partialOrderRejection: "",
      enableTracking: "",
      printPackingSlip: "",
      printPicklists: "",
      showShippingOrders: "",
      requestTransfer: "",
      handoverProof: "",
      productIdentifier: {
        productIdentificationPref: {
          primaryId: '',
          secondaryId: ''
        },
        productIdentificationOptions: [] as any[],
        sampleProducts: [],
        currentSampleProduct: null
      },
      barcodeIdentifier: {
        barcodeIdentifierPref: "",
        barcodeIdentifierOptions: [] as any[],
      },
      rerouteFulfillment: {
        allowDeliveryMethodUpdate: "",
        allowDeliveryAddressUpdate: "",
        allowPickupUpdate: "",
        allowCancel: "",
        shippingMethod: {
          carrierPartyId: "",
          shipmentMethodTypeId: ""
        },
        orderItemSplit: ""
      }
    } as any,
    facilities: {} as any,
    facilitiesLatLng: {} as any,
    storesInformation: [] as any,
    carriers: [] as any[],
    availableShipmentMethods: [] as any[]
  }),

  getters: {
    getCurrentFacility: (state) => state.currentFacility,
    getCurrentEComStore: (state) => state.currentEComStore,
    getProductStores(state) {
      return state.currentFacility?.productStores || []
    },
    getSettings: (state) => state.settings,
    isProductStoreSettingEnabled: (state) => (settingName: string) => state.settings[settingName] === "Y",
    isPartialOrderRejectionEnabled(): boolean {
      return this.isProductStoreSettingEnabled('partialOrderRejection')
    },
    isTrackingEnabled(): boolean {
      return this.isProductStoreSettingEnabled('enableTracking')
    },
    isPrintPackingSlipEnabled(): boolean {
      return this.isProductStoreSettingEnabled('printPackingSlip')
    },
    isPrintPicklistsEnabled(): boolean {
      return this.isProductStoreSettingEnabled('printPicklists')
    },
    isShowShippingOrdersEnabled(): boolean {
      return this.isProductStoreSettingEnabled('showShippingOrders')
    },
    isRequestTransferEnabled(): boolean {
      return this.isProductStoreSettingEnabled('requestTransfer')
    },
    isHandoverProofEnabled(): boolean {
      return this.isProductStoreSettingEnabled('handoverProof')
    },
    getProductIdentificationPref: (state) => state.settings.productIdentifier.productIdentificationPref,
    getBarcodeIdentifierPref: (state) => state.settings.barcodeIdentifier.barcodeIdentifierPref,
    getProductIdentificationOptions: (state) => state.settings.productIdentifier.productIdentificationOptions,
    getBarcodeIdentifierOptions: (state) => state.settings.barcodeIdentifier.barcodeIdentifierOptions,
    getCurrentSampleProduct: (state) => state.settings.productIdentifier.currentSampleProduct,
    isRerouteSettingEnabled: (state) => (settingName: string) => state.settings.rerouteFulfillment[settingName] === "Y",
    getRerouteShipmentMethod: (state) => state.settings.rerouteFulfillment.shippingMethod,
    getFacilityName: (state) => (facilityId: string) => state.facilities[facilityId] ? state.facilities[facilityId] : facilityId,
    getFacilityLatLon: (state) => (facilityId: string) => state.facilitiesLatLng[facilityId] ? state.facilitiesLatLng[facilityId] : {},
    getStoresInformation: (state) => state.storesInformation ? state.storesInformation : [],
    getCarriers: (state) => state.carriers,
    getAvailableShipmentMethods: (state) => state.availableShipmentMethods
  },

  actions: {
    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },
    async setCurrentEComStore(store: any) {
      this.currentEComStore = store
      await this.fetchEComStoreDependencies(store.productStoreId)
    },
    async fetchUserFacilities() {
      const userStore = useUserStore();
      let facilityIds: Array<string> = [];
      let filters: any = {};
      let resp = {} as any

      const partyId = userStore.getUserProfile?.partyId;
      const isAdminUser = userStore.hasPermission("STOREFULFILLMENT_ADMIN");
      const facilityGroupId = "OMS_FULFILLMENT";

      try {
        this.currentFacility = {
          ...this.currentFacility,
          productStores: []
        }

        // Fetch the facilities associated with party
        if (partyId && !isAdminUser) {
          try {
            resp = await api({
              url: `admin/user/${partyId}/facilities`,
              method: "GET",
              params: {
                pageSize: 500
              }
            } as any);

            // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
            // Considering that the facilities will always have a thruDate of the past.
            const facilities = resp.data.filter((facility: any) => !facility.thruDate)

            facilityIds = facilities.map((facility: any) => facility.facilityId);
            if (!facilityIds.length) {
              return Promise.reject({
                code: 'error',
                message: 'Failed to fetch user facilities',
                serverResponse: resp.data
              })
            }
          } catch (error) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user associated facilities',
              serverResponse: error
            })
          }
        }

        if (facilityIds.length) {
          filters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          }
        }

        // Fetch the facilities associated with group
        if (facilityGroupId) {
          try {
            resp = await api({
              url: "oms/groupFacilities",
              method: "GET",
              params: {
                facilityGroupId,
                pageSize: 500,
                ...filters
              }
            } as any);

            // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
            // Considering that the facilities will always have a thruDate of the past.
            const facilities = resp.data.filter((facility: any) => !facility.thruDate)

            facilityIds = facilities.map((facility: any) => facility.facilityId);
            if (!facilityIds.length) {
              return Promise.reject({
                code: 'error',
                message: 'Failed to fetch user facilities',
                serverResponse: resp.data
              })
            }
          } catch (error) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch facilities for group',
              serverResponse: error
            })
          }
        }

        if (facilityIds.length) {
          filters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          }
        }

        const params = {
          url: "oms/facilities",
          method: "GET",
          params: {
            pageSize: 500,
            ...filters
          }
        }

        resp = await api(params);
        this.facilities = resp.data
        this.setCurrentFacility(resp.data[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async setFacilityPreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.getUserProfile.userId,
            preferenceKey: 'SELECTED_FACILITY',
            preferenceValue: payload.facilityId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentFacility = payload;
    },
    async fetchFacilityPreference() {
      const userStore = useUserStore();
      try {
        const preferredFacilityResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: userStore.current.userId,
            preferenceKey: "SELECTED_FACILITY"
          },
        }) as any;
        const preferredFacilityId = preferredFacilityResp.data?.[0]?.preferenceValue;
        if (preferredFacilityId) {
          const currentFacility = this.facilities.find((facility: any) => facility.facilityId === preferredFacilityId);
          currentFacility && this.setCurrentFacility(currentFacility)
        }
      } catch (err) {
        logger.error('Favourite facility not found', err)
      }
    },
    async fetchProductStores(currentFacilityId?: string) {
      try {
        const facilityId = currentFacilityId ?? this.currentFacility.facilityId;
        const pageSize = 200;

        const resp = await api({
          url: `oms/facilities/${facilityId}/productStores`,
          method: "GET",
          params: {
            pageSize,
            facilityId
          }
        }) as any;

        const stores = resp.data.filter((store: any) => !store.thruDate)

        if (stores.length) {
          // Fetching all stores for the store name
          try {
            const productStoresResp = await api({
              url: "oms/productStores",
              method: "GET",
              params: {
                pageSize: 200
              }
            }) as any;
            const productStores = productStoresResp.data;
            const productStoresMap = {} as any;
            productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
            stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
          } catch (error) {
            console.error(error);
          }
        }

        this.currentFacility = {
          ...this.currentFacility,
          productStores: stores
        }

        this.currentFacility.productStores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.setCurrentEComStore(this.currentFacility.productStores[0])
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchProductStorePreference() {
      const userStore = useUserStore();
      try {
        const preferredStoreResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: userStore.current.userId,
            preferenceKey: "SELECTED_BRAND"
          },
        }) as any;
        const preferredStoreId = preferredStoreResp.data?.[0]?.preferenceValue
        if (preferredStoreId) {
          const store = this.currentFacility.productStores.find((store: any) => store.productStoreId === preferredStoreId);
          store && this.setCurrentEComStore(store)
        }
      } catch (err) {
        logger.error('Favourite product store not found', err)
      }
    },
    async fetchEComStoreDependencies(productStoreId: string) {
      try {
        await this.fetchProductStoreSettings(productStoreId)
      } catch (err) {
        logger.error("error", err)
      }
    },
    async setEComStorePreference(payload: any) {
      const userStore = useUserStore();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.current.userId,
            preferenceKey: 'SELECTED_BRAND',
            preferenceValue: payload.productStoreId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentEComStore = payload;
    },
    async fetchProductStoreSettings(productStoreId: string) {
      const defaultProductStoreSettings = JSON.parse(import.meta.env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS as string || '{}')
      const productStoreSettings = {} as any

      if (productStoreId) {
        const payload = {
          productStoreId,
          settingTypeEnumId: Object.keys(defaultProductStoreSettings),
          settingTypeEnumId_op: "in",
          pageIndex: 0,
          pageSize: 50
        }
        try {
          const resp = await api({
            url: `/oms/dataDocumentView`,
            method: "POST",
            data: {
              dataDocumentId: "ProductStoreSetting",
              customParametersMap: payload
            }
          }) as any

          resp?.data?.entityValueList?.forEach((productSetting: any) => {
            productStoreSettings[productSetting.settingTypeEnumId] = productSetting.settingValue
          })
        } catch (error) {
          logger.error("Failed to fetch settings", error)
        }
      }

      Object.entries(defaultProductStoreSettings).forEach(([settingTypeEnumId, setting]: any) => {
        const { stateKey, value } = setting;
        const settingValue = productStoreSettings[settingTypeEnumId];
        let finalValue;
        try {
          finalValue = settingValue ? JSON.parse(settingValue) : value;
        } catch (e) {
          finalValue = settingValue; // fallback to raw value
        }

        const keys = stateKey.split('.');
        let current = this.settings;

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          if (i === keys.length - 1) {
            current[key] = finalValue;
          } else {
            // ensure object exists at each level
            if (!current[key] || typeof current[key] !== 'object') {
              current[key] = {};
            }
            current = current[key];
          }
        }
      })
    },

    async setProductStoreSetting(productStoreId: string, settingTypeEnumId: string, settingValue: any) {
      const defaultProductStoreSettings = JSON.parse(import.meta.env.VITE_DEFAULT_PRODUCT_STORE_SETTINGS as string || '{}')

      try {
        const payloadSettingValue = typeof settingValue === 'object' ? JSON.stringify(settingValue) : settingValue;
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId,
            settingValue: payloadSettingValue
          }
        })
        if (!commonUtil.hasError(resp)) {
          const defaultSetting = defaultProductStoreSettings[settingTypeEnumId]
          const { stateKey } = defaultSetting
          const keys = stateKey.split('.');
          let current = this.settings;

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            if (i === keys.length - 1) {
              current[key] = settingValue;
            } else {
              // ensure object exists at each level
              if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
              }
              current = current[key];
            }
          }
          commonUtil.showToast(translate('Product Store setting updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update Product Store setting.'))
        logger.error(err)
      }
    },

    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      let fetchedGoodIdentificationOptions = []
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: {
            parentTypeId: "HC_GOOD_ID_TYPE",
            pageSize: 50
          }
        });

        fetchedGoodIdentificationOptions = resp.data
      } catch (error) {
        console.error('Failed to fetch good identification types', error)
      }

      // Merge the arrays and remove duplicates
      this.settings.productIdentifier.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort();
      this.settings.productIdentifier.goodIdentificationOptions = fetchedGoodIdentificationOptions
    },

    async fetchProducts() {
      const params = { viewSize: 10 }
      try {
        const products = await api({
          baseURL: commonUtil.getOmsURL(),
          url: "searchProducts",
          method: "post",
          data: params,
          cache: true
        }) as any;

        if (!commonUtil.hasError(products)) {
          this.settings.productIdentifier.sampleProducts = products.data.response.docs;
          this.shuffleProduct()
        } else {
          throw products.data
        }
      } catch (error: any) {
        console.error(error)
      }
    },
    shuffleProduct() {
      if (this.settings.productIdentifier.sampleProducts.length) {
        const randomIndex = Math.floor(Math.random() * this.settings.productIdentifier.sampleProducts.length)
        this.settings.productIdentifier.currentSampleProduct = this.settings.productIdentifier.sampleProducts[randomIndex]
      } else {
        this.settings.productIdentifier.currentSampleProduct = null
      }
    },
    async fetchFacilities(facilityIds: any) {
      const cachedFacilityIds = Object.keys(this.facilities);
      const facilityIdFilter = [...new Set(facilityIds.filter((facilityId: any) => !cachedFacilityIds.includes(facilityId)))]

      if (!facilityIdFilter.length) return;

      const payload = {
        inputFields: {
          facilityId: facilityIdFilter,
          facilityId_op: "in"
        },
        viewSize: facilityIdFilter.length,
        entityName: "Facility",
        noConditionFind: 'Y',
        distinct: "Y",
        fieldList: ["facilityId", "facilityName"]
      }

      try {
        const resp = await api({
          url: "performFind",
          method: "post",
          baseURL: commonUtil.getOmsURL(),
          data: payload
        });
        if (!commonUtil.hasError(resp) && resp.data?.docs.length > 0) {
          resp.data.docs.map((facility: any) => {
            this.facilities[facility.facilityId] = facility["facilityName"]
          })
        } else {
          throw resp.data;
        }
      } catch (err) {
        console.error("Failed to fetch facility information", err)
      }
    },
    clearFacilities() {
      this.facilities = {};
    },
    async fetchCurrentFacilityLatLon(facilityId: string) {
      const payload = {
        inputFields: {
          facilityId
        },
        entityName: "FacilityContactDetailByPurpose",
        orderBy: "fromDate DESC",
        filterByDate: "Y",
        fieldList: ["latitude", "longitude"],
        viewSize: 5
      }

      try {
        const resp = await api({
          url: "performFind",
          method: "post",
          baseURL: commonUtil.getOmsURL(),
          data: payload
        })
        if (!commonUtil.hasError(resp) && resp.data?.docs.length > 0) {
          const validCoords = resp.data.docs.find((doc: any) =>
            doc.latitude !== null && doc.longitude !== null
          )
          if (validCoords) {
            this.facilitiesLatLng[facilityId] = validCoords;
          }
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch facility lat/long information", err)
      }
    },
    clearCurrentFacilityLatLon() {
      this.facilitiesLatLng = {};
    },
    async fetchStoresInformation(point: any) {
      const payload = {
        viewSize: 250,
        filters: ["storeType: RETAIL_STORE"],
        point: `${point.latitude},${point.longitude}`
      }
      try {
        const resp = await api({
          url: "storeLookup",
          method: "post",
          data: payload
        })
        if (!commonUtil.hasError(resp) && resp.data?.response?.docs?.length > 0) {
          this.storesInformation = resp.data.response.docs;
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error("Failed to fetch stores information by lat/lon", err)
      }
    },
    clearStoresInformation() {
      this.storesInformation = [];
    },
    async updateRerouteFulfillmentConfig(payload: any): Promise<any> {
      return api({
        url: `admin/productStores/${payload.productStoreId}/settings`,
        method: "post",
        data: payload
      });
    },
    async fetchCarriers() {
      try {
        const resp = await api({
          url: "performFind",
          method: "get",
          baseURL: commonUtil.getOmsURL(),
          params: {
            "entityName": "CarrierShipmentMethodCount",
            "inputFields": {
              "roleTypeId": "CARRIER",
              "partyTypeId": "PARTY_GROUP"
            },
            "fieldList": ["partyId", "roleTypeId", "groupName"],
            "viewIndex": 0,
            "viewSize": 250,
            "distinct": "Y",
            "noConditionFind": "Y",
            "orderBy": "groupName"
          }
        }) as any;
        if (!commonUtil.hasError(resp) && resp.data?.docs) {
          this.carriers = resp.data.docs;
        } else {
          this.carriers = [];
        }
      } catch (err) {
        logger.error(err)
      }
    },
    async fetchProductStoreShipmentMethods(productStoreId: string) {
      try {
        const resp = await api({
          url: "performFind",
          method: "get",
          baseURL: commonUtil.getOmsURL(),
          params: {
            "inputFields": {
              "productStoreId": productStoreId,
              "shipmentMethodTypeId": "STOREPICKUP",
              "shipmentMethodTypeId_op": "notEqual"
            },
            "filterByDate": 'Y',
            "entityName": "ProductStoreShipmentMethView",
            "fieldList": ["productStoreShipMethId", "partyId", "shipmentMethodTypeId", "description"],
            "viewSize": 250
          }
        }) as any;
        if (!commonUtil.hasError(resp) && resp.data?.docs) {
          this.availableShipmentMethods = resp.data.docs;
        } else {
          this.availableShipmentMethods = [];
        }
      } catch (err) {
        logger.error(err)
      }
    },
  },
  persist: true
})
