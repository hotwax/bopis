import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { UtilService } from '@/services/UtilService'
import { hasError } from '@/adapter'

const actions: ActionTree<UtilState, RootState> = {
  async fetchRejectReasons({ commit }) {
    let rejectReasons = [];
    try {
      const payload = {
        "inputFields": {
          "parentEnumTypeId": ["REPORT_AN_ISSUE", "RPRT_NO_VAR_LOG"],
          "parentEnumTypeId_op": "in"
        },
        "fieldList": ["enumId", "description"],
        "distinct": "Y",
        "entityName": "EnumTypeChildAndEnum",
        "viewSize": 20 // keeping view size 20 as considering that we will have max 20 reasons
      }

      const resp = await UtilService.fetchRejectReasons(payload)

      if(!hasError(resp) && resp.data.count > 0) {
        rejectReasons = resp.data.docs
      } else {
        throw resp.data
      }
    } catch (err) {
      console.error('Failed to fetch reject reasons', err)
    }

    commit(types.UTIL_REJECT_REASONS_UPDATED, rejectReasons)
  },

  async updateRejectReasons({ commit }, payload) {
    commit(types.UTIL_REJECT_REASONS_UPDATED, payload)
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
      console.error('Error fetching payment method description', err)
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
      console.error('Error fetching status description', err)
    }

    return statusDesc;
  }
}

export default actions;