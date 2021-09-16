import { MutationTree } from 'vuex'
import OrderState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <OrderState> = {
  [types.ORDERS_DETAILS] (state, payload) {
    state.orders.details = payload.orders;
    state.orders.total = payload.total;
  },
  [types.ENTIRESHIPGROUP_DETAILS] (state, payload) {
    state.orders.details = payload.orders;
    state.orders.total = payload.total;
  },
  [types.ORDER_SEARCH_UPDATED] (state, payload) {
    state.orders.details = payload.orders;
    state.orders.total = payload.totalordersCount;
  }
}
export default mutations;