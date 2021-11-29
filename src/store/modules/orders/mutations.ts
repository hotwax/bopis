import { MutationTree } from 'vuex'
import ProductState from './OrdersState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
    [types.OPEN_ORDERS_INITIAL] (state , payload) {
        state.orders.list = payload.orders
        state.orders.totalCount = payload.ordersCount
        console.log(state)
    }
    ,
    [types.PRODUCT_CURRENT_UPDATED] (state, payload) {
        
        state.current = payload.product
        console.log("payload",payload.product)
      }

}

export default mutations;