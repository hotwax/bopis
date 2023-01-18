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
      const resp: Array<Stock> = await fetchProductsStockAtFacility(productIds, this.state.user.currentFacility.facilityId)
      commit(types.STOCK_ADD_PRODUCTS, resp)
    } catch(err: Response) {
      console.error(err.message)
    }
  }

}
export default actions;