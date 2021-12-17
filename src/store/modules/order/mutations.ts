import { MutationTree } from 'vuex'
import ProductState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.ORDER_OPEN_UPDATED] (state , payload ) {
    state.open.list = payload.orders
    state.open.total = payload.total
  },
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload.order
  },
  [types.ORDER_PACKED_UPDATED] (state, payload) {
    state.packed.list = payload.orders
    state.packed.total = payload.total
  }
}

export default mutations;