import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const productIdFilter= productIds.reduce((filter: string, productId: any) => {
      // If product already exist in cached products skip
      if (cachedProductIds.includes(productId)) {
        return filter;
      } else {
        // checking condition that if the filter is not empty then adding 'OR' to the filter
        if (filter !== '') filter += ' OR '
        return filter += productId;
      }
    }, '');

    // If there are no products skip the API call
    if (productIdFilter === '') return;

    // adding viewSize as by default we are having the viewSize of 10
    const resp = await ProductService.fetchProducts({
      "filters": ['productId: (' + productIdFilter + ')'],
      "viewSize": productIds.length
    })
    if (resp.status === 200 && resp.data.response && !hasError(resp)) {
      const products = resp.data.response.docs;
      // Handled empty response in case of failed query
      if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
    } else {
      console.error('Something went wrong')
    }
    // TODO Handle specific error
    return resp;
  },

  async fetchProduct({ commit, state }, { productId }) {
    const cachedProduct = Object.keys(state.cached);
    if(cachedProduct.includes(productId)) {
      return productId;
    }
    let resp;
    try {
      resp = await ProductService.fetchProducts({
        "filters": [`productId: ( ${productId} )`]
      })
      if(resp.status == 200 && resp.data.response?.numFound > 0 && !hasError(resp)) {
        const product = resp.data.response.docs[0];
        commit(types.PRODUCT_ADD_TO_CACHED, product);
      } else {
        showToast(translate('Something went wrong'));
      }
    } catch(error) {
        console.error(error);
        showToast(translate('Something Went wrong'));
    }
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