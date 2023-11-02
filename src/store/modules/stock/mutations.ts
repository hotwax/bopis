import { MutationTree } from 'vuex'
import StockState from './StockState'
import * as types from './mutation-types'

const mutations: MutationTree <StockState> = {
  [types.STOCK_ADD_PRODUCT] (state, payload) {
    if(state.products[payload.productId]) {
      state.products[payload.productId][payload.facilityId] = payload.stock
    } else {
      state.products[payload.productId] = {
        [payload.facilityId]: payload.stock
      }
    }
  }
}
export default mutations;