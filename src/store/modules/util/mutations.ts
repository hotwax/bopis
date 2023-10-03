import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_REJECT_REASONS_UPDATED] (state, payload) {
    state.rejectReasons = payload
  }
}
export default mutations;