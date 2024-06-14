import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_REJECT_REASONS_UPDATED] (state, payload) {
    state.rejectReasons = payload
  },
  [types.UTIL_STATUS_UPDATED] (state, payload) {
    state.statusDesc = payload
  },
  [types.UTIL_PAYMENT_METHODS_UPDATED] (state, payload) {
    state.paymentMethodTypeDesc = payload
  },
  [types.UTIL_FACILITY_TYPE_UPDATED](state, payload) {
    state.facilityTypeDesc = payload
  },
  [types.UTIL_PARTY_NAMES_UPDATED](state, payload) {
    state.partyNames = payload
  },
}
export default mutations;