import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { fetchProductsStock, isError, Stock, Response } from '@hotwax/oms-api'

const actions: ActionTree<StockState, RootState> = {

  /**
   * Add stocks of specific product
   */
  async addProduct  ( { commit }, { productId }) {
    const resp: any = await StockService.checkInventory({ productId });
    if (resp.status === 200) {
      commit(types.STOCK_ADD_PRODUCT, { productId, stock: resp.data.docs })
    }
  },

  /**
   * Add stocks of list of products
   */
   async addProducts({ commit }, { productIds }) {
    const resp: Array<Stock> | Response = await fetchProductsStock(productIds, this.state.user.currentFacility.facilityId);
    if (!isError(resp)) {
      // Handled empty response in case of failed query
      commit(types.STOCK_ADD_PRODUCTS, { products: resp })
    }
  }

}
export default actions;