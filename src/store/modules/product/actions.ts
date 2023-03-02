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
    } catch(error){
      console.error(error)
      commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 })
      showToast(translate("Something went wrong"));
    }
    // Remove added loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    // TODO Handle specific error
    return resp;
  },

  async addProductToCache({ commit, state }, payload) {
    // checking if product is already in cache
    // We are using this action to set the virtual product before visiting the pdp page.
    // Caching the virtual product may reduce the API load.
    // Considering the case that when the virtual product page is visited, it already had variants with it
    // It would futile to again set the virtual product payload that doesn't have variants in it
    if (!state.cached[payload.productId]) commit(types.PRODUCT_ADD_TO_CACHED, payload);
  },

  async setCurrent({ commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    
    // checking if product is in cache
    let product = state.cached[payload.productId] ? JSON.parse(JSON.stringify(state.cached[payload.productId])) : {}
    const isProductCached = Object.keys(product).length;
    if (isProductCached && product.variants?.length) return commit(types.PRODUCT_CURRENT_UPDATED, product)

    let resp;
    let productFilterCondition: any = `groupId: ${payload.productId}`;
    if (!isProductCached) productFilterCondition = `${productFilterCondition} OR productId: ${payload.productId}`;
    try {
      resp = await ProductService.findProducts({
        "filters": [productFilterCondition],
        "viewSize": 50,
      })
      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && !hasError(resp) && resp.data.response?.numFound) {
        let variants = resp.data.response.docs;
        if(!isProductCached) {
          product = resp.data.response.docs.find((product: any) => product.productId === payload.productId);
          variants = resp.data.response.docs.filter((product: any) => product.productId !== payload.productId);
        }
        product['variants'] = variants;
        commit(types.PRODUCT_CURRENT_UPDATED, product)
        commit(types.PRODUCT_ADD_TO_CACHED, product);
      } else {
        showToast(translate("Product not found"));
      }
    } catch(error){
      console.error(error)
      showToast(translate("Something went wrong"));
    }
    // Remove added loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("dismissLoader");
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