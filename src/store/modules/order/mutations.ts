import { MutationTree } from 'vuex'
import ProductState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.ORDER_OPEN_UPDATED] (state , payload ) {
    state.orders.list = payload.orders
    state.orders.total = payload.total
  },
  [types.ORDER_CURRENT_UPDATED] (state, payload) {
    state.current = payload.order
  },
  [types.ORDER_PACKED_UPDATED] (state, payload) {
    state.packedOrders.list = payload.packedOrders
    state.packedOrders.total = payload.total
  }
}

export default mutations;