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
  },
  [types.STOCK_ADD_PRODUCT_INFORMATION] (state, { productId, facilityId, minimumStock, onlineAtp, reservedQuantity }) {
    if (!state.inventoryInformation[productId]) {
      state.inventoryInformation[productId] = {}
    }

    const inventoryData = state.inventoryInformation[productId][facilityId] || {};

    state.inventoryInformation[productId][facilityId] = {
      minimumStock: minimumStock != undefined ? minimumStock : inventoryData.minimumStock,
      onlineAtp: onlineAtp != undefined ? onlineAtp : inventoryData.onlineAtp,
      reservedQuantity: reservedQuantity != undefined ? reservedQuantity : inventoryData.reservedQuantity,
    }
  }
}

export default mutations;