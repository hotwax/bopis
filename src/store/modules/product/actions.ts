import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { showToast } from '@/utils'
import { hasError } from '@/adapter'
import { translate } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import logger from "@/logger";


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
      logger.error('Something went wrong')
    }
    // TODO Handle specific error
    return resp;
  },

  async findProduct ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    try {
      // Updating the queryString here as even if no products are found it must keep queryString search the same
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
        commit(types.PRODUCT_LIST_UPDATED, { products, total, queryString: payload.queryString })
      } else {
        //showing error whenever getting no products in the response or having any other error
        // queryString is persisted even if the search results in 'products not found'
        commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0, queryString: payload.queryString })
        showToast(translate("Products not found"));
      }
    } catch(error){
      logger.error(error)
      commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0, queryString: '' })
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
    
    // checking if product is in cache
    let product = state.cached[payload.productId] ? JSON.parse(JSON.stringify(state.cached[payload.productId])) : {}
    const isProductCached = Object.keys(product).length;
    if (isProductCached && product.variants?.length) return commit(types.PRODUCT_CURRENT_UPDATED, product)

    emitter.emit("presentLoader");
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
      logger.error(error)
      showToast(translate("Something went wrong"));
    }
    emitter.emit("dismissLoader");
    // TODO Handle specific error
    return resp;
  },

  async getProductInformation ({ dispatch }, { orders }) {
    let productIds: any = new Set();
    orders.forEach((list: any) => {
      list.doclist.docs.forEach((order: any) => {
        if (order.productId) {
          productIds.add(order.productId)
        }
      })
    })

    productIds = [...productIds]
    if (productIds.length) {
      await dispatch('fetchProducts', { productIds })
    }
  },

  clearProducts ({ commit }) {
    commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0, queryString: '' })
  },

  async fetchProductComponents ( { commit, dispatch, state }, { productId }) {
    // If there are no products skip the API call
    if (productId === '') return;

    const cachedProductIds = Object.keys(state.cached);
    if (!cachedProductIds.includes(productId)) {
      await dispatch('fetchProducts', { productIds: [productId] })
    }
    const product = state.cached[productId]
    if (product.productComponents && product.productComponents.length > 0) {
      return;
    }

    let resp;
    try {
      resp = await ProductService.fetchProductComponents({
        "entityName": "ProductAssoc",
          "inputFields": {
            "productId": productId,
            "productTypeId": "PRODUCT_COMPONENT"
          },
          "fieldList": ["productId", "productIdTo", "productAssocTypeId"],
          "viewIndex": 0,
          "viewSize": 250,  // maximum records we could have
          "distinct": "Y",
          "noConditionFind": "Y",
          "filterByDate": "Y"
      })
      if (!hasError(resp)) {
        const productComponents = resp.data.docs;
        const componentProductIds = productComponents.map((productComponent: any) => productComponent.productIdTo);
        await dispatch('fetchProducts', { productIds: componentProductIds })
        
        product["productComponents"] = productComponents;
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products: [product] });
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Failed to fetch product components information', err)
    }
    return resp;
  }
}

export default actions;