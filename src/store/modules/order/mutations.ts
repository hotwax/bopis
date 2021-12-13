import { MutationTree } from 'vuex'
import ProductState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.OPEN_ORDERS_INITIAL] (state , payload ) {
    state.orders.list = payload.orders
    state.orders.total = payload.ordersCount
  },
  [types.ORDERS_CURRENT_UPDATED] (state, payload) {
    state.current = payload.order
  },
  [types.ORDERS_PACKED_INITIAL] (state, payload) {
    state.packedOrders.list = payload.packedOrders
    state.packedOrders.total = payload.total
  },
  [types.ORDERS_CLEARED] (state) {
    state.orders.list = {}
    state.orders.total = 0
    state.packedOrders = {}
    state.packedOrders.total = 0
  }
}

export default mutations;