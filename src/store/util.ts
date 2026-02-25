import { defineStore } from 'pinia'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'
import { useUserStore } from './user'

export const useUtilStore = defineStore('util', {
  state: () => ({
    rejectReasons: [] as any,
    partyNames: {} as any,
    cancelReasons: [] as any,
    facilities: {} as any,
    enumerations: {} as any,
    facilitiesLatLng: {} as any,
    storesInformation: [] as any
  }),
  getters: {
    getRejectReasons: (state) => state.rejectReasons ? state.rejectReasons : [],
    getPartyName: (state) => (partyId: string) => state.partyNames[partyId] ? state.partyNames[partyId] : '',
    getCancelReasons: (state) => state.cancelReasons ? state.cancelReasons : [],
    getFacilityName: (state) => (facilityId: string) => state.facilities[facilityId] ? state.facilities[facilityId] : facilityId,
    getEnumDescription: (state) => (enumId: string) => state.enumerations[enumId] ? state.enumerations[enumId] : enumId,
    getFacilityLatLon: (state) => (facilityId: string) => state.facilitiesLatLng[facilityId] ? state.facilitiesLatLng[facilityId] : {},
    getStoresInformation: (state) => state.storesInformation ? state.storesInformation : []
  },
  actions: {
    async fetchRejectReasons() {
      const userStore = useUserStore();
      const isAdminUser = userStore.permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")

      let rejectReasons = [];
      let payload = {
        orderByField: "sequenceNum"
      } as any;

      try {
        let resp;
        if (isAdminUser) {
          payload = {
            parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
            parentTypeId_op: "in",
            pageSize: 20,
            ...payload
          }
          resp = await UtilService.fetchRejectReasons(payload);
        } else {
          payload = {
            enumerationGroupId: "BOPIS_REJ_RSN_GRP",
            pageSize: 200,
            ...payload
          }
          resp = await UtilService.fetchRejectReasonsByEnumerationGroup(payload);
        }

        if (!hasError(resp) && resp.data) {
          rejectReasons = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch reject reasons', err)
      }

      this.rejectReasons = rejectReasons;
    },
    async fetchCancelReasons() {
      let cancelReasons = [];
      const payload = {
        enumerationGroupId: "BOPIS_CNCL_RES",
        pageSize: 100,
        orderByField: "sequenceNum"
      }

      try {
        const resp = await UtilService.fetchCancelReasons(payload)
        if (!hasError(resp)) {
          cancelReasons = resp.data
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch cancel reasons', err)
      }
      this.cancelReasons = cancelReasons;
    },
    updateRejectReasons(payload: any) {
      this.rejectReasons = payload;
    },
    updateCancelReasons(payload: any) {
      this.cancelReasons = payload;
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
        const resp = await UtilService.fetchFacilities(payload);
        if (!hasError(resp) && resp.data?.docs.length > 0) {
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
    async fetchEnumerations(enumIds: any) {
      const cachedEunmIds = Object.keys(this.enumerations);
      const enumIdsFilter = [...new Set(enumIds.filter((enumId: any) => !cachedEunmIds.includes(enumId)))]

      if (!enumIdsFilter.length) return;

      const payload = {
        inputFields: {
          enumId: enumIdsFilter,
          enumId_op: "in"
        },
        viewSize: enumIdsFilter.length,
        entityName: "Enumeration",
        noConditionFind: 'Y',
        distinct: "Y",
        fieldList: ["enumId", "description"]
      }

      try {
        const resp = await UtilService.fetchEnumerations(payload);
        if (!hasError(resp) && resp.data?.docs.length > 0) {
          resp.data.docs.map((enumeration: any) => {
            this.enumerations[enumeration.enumId] = enumeration["description"]
          })
        } else {
          throw resp.data;
        }
      } catch (err) {
        console.error("Failed to fetch enumeration information", err)
      }
    },
    clearEnumerations() {
      this.enumerations = {};
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
        const resp = await UtilService.fetchCurrentFacilityLatLon(payload)
        if (!hasError(resp) && resp.data?.docs.length > 0) {
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
        const resp = await UtilService.fetchStoresInformation(payload)
        if (!hasError(resp) && resp.data?.response?.docs?.length > 0) {
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
    async fetchPartiesInformation(partyIds: any) {
      const cachedPartyIds = Object.keys(this.partyNames);
      const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

      if (!ids.length) return this.partyNames;

      try {
        const payload = {
          partyId: ids,
          partyId_op: "in",
          fieldsToSelect: ["firstName", "middleName", "lastName", "groupName", "partyId"],
          pageSize: ids.length
        }

        const resp = await UtilService.fetchPartiesInformation(payload);
        if (!hasError(resp)) {
          const partyResp = {} as any
          resp.data.map((partyInformation: any) => {
            let partyName = ''
            if (partyInformation.groupName) {
              partyName = partyInformation.groupName
            } else {
              partyName = [partyInformation.firstName, partyInformation.lastName].filter(Boolean).join(' ');
            }
            partyResp[partyInformation.partyId] = partyName
          })
          this.partyNames = { ...this.partyNames, ...partyResp };
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Error fetching party information', err)
      }
      return this.partyNames;
    }
  }
})
