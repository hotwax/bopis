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
  }
}

export default actions;