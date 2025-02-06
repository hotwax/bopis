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
  [types.UTIL_CANCEL_REASONS_UPDATED] (state, payload) {
    state.cancelReasons = payload
  },
  [types.UTIL_FACILITIES_UPDATED] (state, payload) {
    state.facilities = payload
  },
  [types.UTIL_ENUMERATIONS_UPDATED] (state, payload) {
    state.enumerations = payload
  },
  [types.UTIL_CURRENT_FACILITY_LATLON_UPDATED] (state, payload) {
    state.currentFacilityLatLon = payload
  },
  [types.UTIL_STORE_LOOKUP_BY_LATLON_UPDATED] (state, payload) {
    state.storeLookupByLatLon = payload
  }
}
export default mutations;