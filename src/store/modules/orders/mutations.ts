import { MutationTree } from 'vuex'
import ProductState from './OrdersState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
    [types.OPEN_ORDERS_INITIAL] ( state , payload ) {
        state.orders.list = payload.orders
        state.orders.totalCount = payload.ordersCount
    }
    ,
    [types.PRODUCT_CURRENT_UPDATED] (state, payload) {
        
        state.current = payload.product
        console.log("payload",payload.product)
    },
    [types.ORDERS_PACKED_INITIAL] (state, payload) {
      state.packedOrders = payload.packedOrders
    }

}

export default mutations;