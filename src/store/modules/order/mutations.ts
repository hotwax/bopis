import { MutationTree } from 'vuex'
import ProductState from './OrderState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.ORDER_INFO_UPDATED] (state, payload){
    state.orders = payload.orders
  },
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
  },
  [types.ORDER_COMPLETED_UPDATED] (state, payload) {
    state.completed.list = payload.orders
    state.completed.total = payload.total
  },
  [types.ORDER_SHIP_TO_STORE_INCOMING_UPDATED] (state, payload) {
    state.shipToStore.incoming.list = payload.orders
    state.shipToStore.incoming.total = payload.total
  },
  [types.ORDER_SHIP_TO_STORE_RDYFORPCKUP_UPDATED] (state, payload) {
    state.shipToStore.readyForPickup.list = payload.orders
    state.shipToStore.readyForPickup.total = payload.total
  },
  [types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED] (state, payload) {
    state.shipToStore.completed.list = payload.orders
    state.shipToStore.completed.total = payload.total
  },
  [types.ORDER_ITEM_REJECTION_HISTORY_UPDATED] (state, payload) {
    state.orderItemRejectionHistory = payload
  },
  [types.ORDER_COMMUNICATION_EVENTS_UPDATED] (state, payload) {
    state.communicationEvents = payload.communicationEvents // need to rewrite based on payload structure
  }
}

export default mutations;
