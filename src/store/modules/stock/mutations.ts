import { MutationTree } from 'vuex'
import StockState from './StockState'
import * as types from './mutation-types'

const mutations: MutationTree <StockState> = {
  [types.STOCK_ADD_PRODUCT_INFORMATION] (state, { productId, facilityId, payload }) {
    if (!state.inventoryInformation[productId]) {
      state.inventoryInformation[productId] = {
        [facilityId]: payload
      }
      return;
    }
    // If the inventory information for the productId exists update the information for the specific facilityId
    state.inventoryInformation[productId][facilityId] = {
      ...state.inventoryInformation[productId][facilityId],
      ...payload
    }
  }
}

export default mutations;