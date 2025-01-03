import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'
import logger from '@/logger'
import store from '@/store'
import { OrderService } from '@/services/OrderService'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    const permissions = store.getters['user/getUserPermissions'];
    const isAdminUser = permissions.some((permission: any) => permission.action === "APP_STOREFULFILLMENT_ADMIN")
    let isAdminReasonsNeeded = false;

    let rejectReasons = [];
    let payload = {
      "distinct": "Y",
      "viewSize": 100,
      "orderBy": "sequenceNum"
    } as any;

    if(isAdminUser) {
      payload = {
        "inputFields": {
          "parentEnumTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentEnumTypeId_op": "in"
        },
        "fieldList": ["enumId", "description"],
        "entityName": "EnumTypeChildAndEnum",
        ...payload
      }
    } else {
      payload = {
        "inputFields": {
          "enumerationGroupId": "BOPIS_REJ_RSN_GRP"
        },
        // We should not fetch description here, as the description contains EnumGroup description which we don't want to show on UI.
        "fieldList": ["enumerationGroupId", "enumId", "sequenceNum", "enumDescription", "enumName"],
        "entityName": "EnumerationGroupAndMember",
        "filterByDate": "Y",
        ...payload
      }
    }


    try {
      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        rejectReasons = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch reject reasons', err)
      if(!isAdminUser) isAdminReasonsNeeded = true;
    }

    // Refetching all rejection reasons if the api fails to fetch bopis rejection reason due to no entity found.
    // Todo: revert these changes when all the oms are updated.
    if(isAdminReasonsNeeded) {
      try {
        const resp = await UtilService.fetchRejectReasons({
          "inputFields": {
            "parentEnumTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
            "parentEnumTypeId_op": "in"
          },
          "fieldList": ["enumId", "description"],
          "entityName": "EnumTypeChildAndEnum",
          "distinct": "Y",
          "viewSize": 100,
          "orderBy": "sequenceNum"
        })
  
        if(!hasError(resp)) {
          rejectReasons = resp.data.docs
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error('Failed to fetch reject reasons', err)
      }
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },

  async fetchCancelReasons({ commit }) {
    let cancelReasons = [];
    const payload = {
      "inputFields": {
        "enumTypeId": "ODR_ITM_CH_REASON"
      },
      "fieldList": ["enumId", "description"],
      "entityName": "Enumeration",
      "distinct": "Y",
      "viewSize": 100,
      "orderBy": "sequenceNum"
    }

    try {
      const resp = await OrderService.performFind(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        cancelReasons = resp.data.docs
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

  async fetchPaymentMethodTypeDesc({ commit, state }, paymentMethodTypeIds) {
    let paymentMethodTypeDesc = JSON.parse(JSON.stringify(state.paymentMethodTypeDesc))
    const cachedPaymentMethodTypeIds = Object.keys(paymentMethodTypeDesc);
    const ids = paymentMethodTypeIds.filter((paymentMethodTypeId: string) => !cachedPaymentMethodTypeIds.includes(paymentMethodTypeId))

    if(!ids.length) return paymentMethodTypeDesc;

    try {
      const payload = {
        "inputFields": {
          "paymentMethodTypeId": ids,
          "paymentMethodTypeId_op": "in"
        },
        "fieldList": ["paymentMethodTypeId", "description"],
        "entityName": "PaymentMethodType",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPaymentMethodTypeDesc(payload);

      if(!hasError(resp)) {
        const paymentMethodResp = {} as any
        resp.data.docs.map((paymentMethodType: any) => {
          paymentMethodResp[paymentMethodType.paymentMethodTypeId] = paymentMethodType.description
        })

        paymentMethodTypeDesc = {
          ...paymentMethodTypeDesc,
          ...paymentMethodResp
        }

        commit(types.UTIL_PAYMENT_METHODS_UPDATED, paymentMethodTypeDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching payment method description', err)
    }

    return paymentMethodTypeDesc;
  },

  async fetchStatusDesc({ commit, state }, statusIds) {
    let statusDesc = JSON.parse(JSON.stringify(state.statusDesc))
    const cachedStatusIds = Object.keys(statusDesc);
    const ids = statusIds.filter((statusId: string) => !cachedStatusIds.includes(statusId))

    if(!ids.length) return statusDesc;

    try {
      const payload = {
        "inputFields": {
          "statusId": ids,
          "statusId_op": "in"
        },
        "fieldList": ["statusId", "description"],
        "entityName": "StatusItem",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchStatusDesc(payload);

      if(!hasError(resp)) {
        const statusResp = {} as any
        resp.data.docs.map((statusItem: any) => {
          statusResp[statusItem.statusId] = statusItem.description
        })

        statusDesc = {
          ...statusDesc,
          ...statusResp
        }

        commit(types.UTIL_STATUS_UPDATED, statusDesc)
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Error fetching status description', err)
    }

    return statusDesc;
  },

  async fetchFacilityTypeInformation({ commit, state }, facilityTypeIds) {
    const facilityTypeDesc = JSON.parse(JSON.stringify(state.facilityTypeDesc))

    const cachedFacilityTypeIds = Object.keys(facilityTypeDesc);
    const facilityTypeIdFilter = [...new Set(facilityTypeIds.filter((facilityTypeId: any) => !cachedFacilityTypeIds.includes(facilityTypeId)))]

    // If there are no facility types to fetch skip the API call
    if (!facilityTypeIdFilter.length) return;

    const payload = {
      inputFields: {
        facilityTypeId: facilityTypeIds,
        facilityTypeId_op: 'in'
      },
      viewSize: facilityTypeIds.length,
      entityName: 'FacilityType',
      noConditionFind: 'Y',
      distinct: "Y",
      fieldList: ["facilityTypeId", "description"]
    }

    try {
      const resp = await UtilService.fetchFacilityTypeInformation(payload);

      if (!hasError(resp) && resp.data?.docs.length > 0) {
        resp.data.docs.map((facilityType: any) => {
          facilityTypeDesc[facilityType.facilityTypeId] = facilityType['description']
        })

        commit(types.UTIL_FACILITY_TYPE_UPDATED, facilityTypeDesc)
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error('Failed to fetch description for facility types', err)
    }
  },

  async fetchPartyInformation({ commit, state }, partyIds) {
    let partyInformation = JSON.parse(JSON.stringify(state.partyNames))
    const cachedPartyIds = Object.keys(partyInformation);
    const ids = partyIds.filter((partyId: string) => !cachedPartyIds.includes(partyId))

    if (!ids.length) return partyInformation;

    try {
      const payload = {
        "inputFields": {
          "partyId": ids,
          "partyId_op": "in"
        },
        "fieldList": ["firstName", "middleName", "lastName", "groupName", "partyId"],
        "entityName": "PartyNameView",
        "viewSize": ids.length
      }

      const resp = await UtilService.fetchPartyInformation(payload);

      if (!hasError(resp)) {
        const partyResp = {} as any
        resp.data.docs.map((partyInformation: any) => {

          let partyName = ''
          if (partyInformation.groupName) {
            partyName = partyInformation.groupName
          } else {
            partyName = [partyInformation.firstName, partyInformation.lastName].join(' ')
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
    } catch (err) {
      console.error('Error fetching party information', err)
    }

    return partyInformation;
  },

}

export default actions;