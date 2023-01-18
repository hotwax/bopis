import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { fetchProductsStockAtFacility, Stock, Response } from '@/adapter'

const actions: ActionTree<StockState, RootState> = {
  /**
  * Add stocks of list of products
  */
  async addProducts({ commit }, { productIds }) {
    try {
      const resp: Array<Stock> | Response = await fetchProductsStockAtFacility(productIds, this.state.user.currentFacility.facilityId)
      commit(types.STOCK_ADD_PRODUCTS, resp)
    } catch(err) {
      console.error((err as Response).message)
    }
  }

}
export default actions;