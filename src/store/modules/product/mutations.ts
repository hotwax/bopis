import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCTS_DETAILS] (state, payload) {
    state.products.details = payload.products;
    state.products.total = payload.total;
  },
  [types.PACKEDORDERS_DETAILS] (state, payload) {
    state.products.details = payload.products;
    state.products.total = payload.total;
  },
  [types.ENTIRESHIPGROUP_DETAILS] (state, payload) {
    state.products.details = payload.products;
    state.products.total = payload.total;
  },
  [types.ORDER_SEARCH_UPDATED] (state, payload) {
    state.products.details = payload.products;
    state.products.total = payload.totalProductsCount;
  }
}
export default mutations;