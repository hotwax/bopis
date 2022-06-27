import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from './mutation-types'

const mutations: MutationTree <UserState> = {
    [types.USER_TOKEN_CHANGED] (state, payload) {
        state.token = payload.newToken
    },
    [types.USER_END_SESSION] (state) {
      state.token = ''
      state.current = null
      state.currentFacility = {}
    },
    [types.USER_INFO_UPDATED] (state, payload) {
        state.current = payload
    },
    [types.USER_CURRENT_FACILITY_UPDATED] (state, payload) {
        state.currentFacility = payload;
    },
    [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
        state.instanceUrl = payload;
    },
    [types.USER_PACKING_SLIP_ENABLED_UPDATED] (state, payload) {
        state.packingSlipEnabled = payload;
    },
    [types.USER_PREFERENCE_UPDATED] (state, payload) {
        state.preference = {...state.preference, ...payload};
    }
}
export default mutations;