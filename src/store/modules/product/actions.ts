import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { fetchProducts } from "@hotwax/oms-api/src/product";
import { isError } from "@hotwax/oms-api/src/util";


const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const productIdFilter= productIds.reduce((filter: Array<any>, productId: any) => {
      // If product does not exist in cached products then add the id
      if (!cachedProductIds.includes(productId) && productId) {
        filter.push(productId);
      }
      return filter;
    }, []);

    // If there are no product ids to search skip the API call
    if (productIdFilter.length <= 0) return;

    // adding viewSize as by default we are having the viewSize of 10
    const resp = await fetchProducts({
      filters: { 'productId': productIdFilter },
      viewSize: productIdFilter.length,
      viewIndex: 0
    })
    if (!isError(resp)) {
      const products = resp.data.response.docs;
      // Handled empty response in case of failed query
      if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
    } else {
      console.error('Something went wrong')
    }
    // TODO Handle specific error
    return resp;
  },

  async getProductInformation ({ dispatch }, { orders }) {
    let productIds: any = new Set();
    orders.map((order: any) => {
      order.parts.reduce((productIds: Set<any>, part: any) => {
        part.items.map((item: any) => {
          productIds.add(item.productId);
        })
        return productIds;
      }, productIds);
    });
    productIds = [...productIds]
    if (productIds.length) {
      dispatch('fetchProducts', { productIds })
      this.dispatch('stock/addProducts', { productIds })
    }
  }
}

export default actions;