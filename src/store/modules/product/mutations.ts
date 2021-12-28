import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_ADD_TO_CACHED_MULTIPLE] (state, payload) {
    if (payload.products) {
      payload.products.forEach((product: any) => {
        state.cached[product.productId] = product
      });
      state.cached.total = payload.totalProductsCount
    }
  },
  [types.PRODUCT_SEARCH_UPDATED] (state, payload) {
    state.cached = payload.products;
    // state.products.total = payload.totalProductsCount;
  }
}
export default mutations;