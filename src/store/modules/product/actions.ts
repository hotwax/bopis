import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


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

  async fetchProduct ({ commit }, { productId }) {
    try {
      const resp = await ProductService.fetchProducts({
        "filters": ['productId: ' + productId]
      })
      if (resp.status === 200 && !hasError(resp)) {
        const product = resp.data.response.docs[0];
        if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED, product);
        return product;
      }
    } catch (error) {
      console.error(error)
      showToast(translate("Something went wrong"));
    }
  },

  async updateCurrent({ commit }, product) {
    commit(types.PRODUCT_CURRENT_UPDATED, product)
  },

  async findProduct ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ProductService.findProducts({
        // used sku as we are currently only using sku to search for the product
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "keyword": payload.queryString,
        "filters": ['isVirtual: true', 'isVariant: false'],
      })
      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && !hasError(resp) && resp.data.response?.numFound) {
        let products = resp.data.response.docs;
        const total = resp.data.response?.numFound;
        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.list.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products, total })
      } else {
        //showing error whenever getting no products in the response or having any other error
        commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 })
        showToast(translate("Products not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 })
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },

  async updateProductsCache({ commit, state }, payload) {
    // checking if product is in cache
    const product = state.cached[payload.productId] ? JSON.parse(JSON.stringify(state.cached[payload.productId])) : {};
    if (!Object.keys(product).length) commit(types.PRODUCT_ADD_TO_CACHED, payload);
  },

  async setCurrent({ dispatch, commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    
    // checking if product is in cache
    let product = state.cached[payload.productId] ? JSON.parse(JSON.stringify(state.cached[payload.productId])) : {}
    if (Object.keys(product).length && product.variants?.length) return dispatch('updateCurrent', product)

    let resp;
    try {
      resp = await ProductService.findProducts({
        "filters": [`groupId: ${payload.productId}`],
      })
      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && !hasError(resp) && resp.data.response?.numFound) {
        product = !Object.keys(product).length ? await dispatch('fetchProduct', { productId: payload.productId }) : product; 
        product['variants'] = resp.data.response.docs;
        dispatch('updateCurrent', product);
        commit(types.PRODUCT_ADD_TO_CACHED, product);
      } else {
        showToast(translate("Products not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
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
  },

  clearProducts ({ commit }) {
    commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 })
  }
}

export default actions;