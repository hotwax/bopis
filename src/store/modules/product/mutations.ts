import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCTS_DETAILS] (state, payload) {
    state.products.details = payload.products
  },
}
export default mutations;