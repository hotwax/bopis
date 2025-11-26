import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'
import store from '@/store'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    const permissions = store.getters['user/getUserPermissions'];
    const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")
    let isAdminReasonsNeeded = false;

    let rejectReasons = [];
    let payload = {
      orderByField: "sequenceNum"
    } as any;

    try {
      let resp;
      if(isAdminUser) {
        payload = {
          parentTypeId: ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          parentTypeId_op: "in",
          pageSize: 20, // keeping view size 20 as considering that we will have max 20 reasons
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

      if(!hasError(resp) && resp.data) {
        rejectReasons = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch reject reasons', err)
      if(!isAdminUser) isAdminReasonsNeeded = true;
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },

  async fetchCancelReasons({ commit }) {
    let cancelReasons = [];
    const payload = {
      enumerationGroupId: "BOPIS_CNCL_RES",
      pageSize: 100,
      orderByField: "sequenceNum"
    }
    
    try {
      const resp = await UtilService.fetchCancelReasons(payload)

      if(!hasError(resp)) {
        cancelReasons = resp.data
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch cancel reasons', err)
    }

    commit(types.UTIL_CANCEL_REASONS_UPDATED, cancelReasons)
  },

  async updateRejectReasons({ commit }, payload) {
    commit(types.UTIL_REJECT_REASONS_UPDATED, payload)
  },

  async updateCancelReasons({ commit }, payload) {
    commit(types.UTIL_CANCEL_REASONS_UPDATED, payload)
  },

  // Fetching all the facilities
  async fetchFacilities({ commit, state }, facilityIds) {
    const facilities = JSON.parse(JSON.stringify(state.facilities))

    const cachedFacilityIds = Object.keys(facilities);
    const facilityIdFilter = [...new Set(facilityIds.filter((facilityId: any) => !cachedFacilityIds.includes(facilityId)))]

    // If there are no facility info to fetch skip the API call
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
          facilities[facility.facilityId] = facility["facilityName"]
        })

        commit(types.UTIL_FACILITIES_UPDATED, facilities)
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error("Failed to fetch facility information", err)
    }
  },

  async clearFacilities({ commit }) {
    commit(types.UTIL_FACILITIES_UPDATED, {})
  },

  async fetchEnumerations({ commit, state }, enumIds) {
    const enumerations = JSON.parse(JSON.stringify(state.enumerations))

    const cachedEunmIds = Object.keys(enumerations);
    const enumIdsFilter = [...new Set(enumIds.filter((enumId: any) => !cachedEunmIds.includes(enumId)))]

    // If there are no enum info to fetch skip the API call
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
          enumerations[enumeration.enumId] = enumeration["description"]
        })

        commit(types.UTIL_ENUMERATIONS_UPDATED, enumerations)
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error("Failed to fetch enumeration information", err)
    }
  },

  async clearEnumerations({ commit }) {
    commit(types.UTIL_ENUMERATIONS_UPDATED, {})
  },

  async fetchCurrentFacilityLatLon({ commit }, facilityId) {
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
        // Find first doc with non-null coordinates
        const validCoords = resp.data.docs.find((doc: any) => 
          doc.latitude !== null && doc.longitude !== null
        )
        
        if (validCoords) {
          commit(types.UTIL_FACILITY_LAT_LON_UPDATED, { facilityId, validCoords })
        }
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error("Failed to fetch facility lat/long information", err)
    }
  },

  async clearCurrentFacilityLatLon({ commit }) {
    commit(types.UTIL_FACILITY_LAT_LON_UPDATED, {})
  },

  async fetchStoresInformation({ commit }, point) {
    const payload = {
      viewSize: 250,
      filters: ["storeType: RETAIL_STORE"],
      point: `${point.latitude},${point.longitude}`
    }
      
    try {
      const resp = await UtilService.fetchStoresInformation(payload)

      if (!hasError(resp) && resp.data?.response?.docs?.length > 0) {
        commit(types.UTIL_STORES_INFORMATION_UPDATED, resp.data.response.docs)
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error("Failed to fetch stores information by lat/lon", err)
    }
  },

  async clearStoresInformation({ commit }) {
    commit(types.UTIL_STORES_INFORMATION_UPDATED, [])
  },
  
  async fetchPartiesInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if(!ids.length) return partyInformation;
    
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
          if(partyInformation.groupName) {
            partyName = partyInformation.groupName
          } else {
            partyName = [partyInformation.firstName, partyInformation.lastName].filter(Boolean).join(' ');
          }

          partyResp[partyInformation.partyId] = partyName
        })

        partyInformation = {
          ...partyInformation,
          ...partyResp
        }

        commit(types.UTIL_PARTY_NAMES_UPDATED, partyInformation)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching party information', err)
    }

    return partyInformation;
  },

}

export default actions;