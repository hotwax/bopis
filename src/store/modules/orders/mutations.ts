import { MutationTree } from 'vuex'
import ProductState from './OrdersState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
    [types.OPEN_ORDERS_INITIAL] ( state , payload ) {
        state.orders.list = payload.orders
        state.orders.total = payload.ordersCount
    }
    ,
    [types.PRODUCT_CURRENT_UPDATED] (state, payload) {
        
        state.current = payload.product
    },
    [types.ORDERS_PACKED_INITIAL] (state, payload) {
      state.packedOrders.list = payload.packedOrders
      state.packedOrders.total = payload.total
    }

}

export default mutations;