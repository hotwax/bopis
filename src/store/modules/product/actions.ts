import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<ProductState, RootState> = {

  // Fetch Product
  async getOrderdetails ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await ProductService.fetchOrders({
        "sortBy": payload.sortBy,
        "sortOrder": payload.sortOrder,
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "facilityId": payload.facilityId,
      })

      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let products = resp.data.docs;
        const total = resp.data.count;
        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.details.concat(products)
        commit(types.PRODUCTS_DETAILS, { products: products, total: total })
      } else {
        //showing error whenever getting no products in the response or having any other error
        showToast(translate("Product not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
  
  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await ProductService.fetchPackedOrders({
        "sortBy": payload.sortBy,
        "sortOrder": payload.sortOrder,
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex,
        "facilityId": payload.facilityId,
      })

      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let products = resp.data.docs;
        const total = resp.data.count;
        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.details.concat(products)
        commit(types.PACKEDORDERS_DETAILS, { products: products, total: total })
      } else {
        //showing error whenever getting no products in the response or having any other error
        showToast(translate("Product not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },

  async quickShipEntireShipGroup ({ commit, state, dispatch }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await ProductService.fetchEntireShipGroup({
        "orderId": payload.orderId,
        "setPackedOnly": payload.setPackedOnly,
        "dimensionUomId": payload.dimensionUomId,
        "shipmentBoxTypeId": payload.shipmentBoxTypeId,
        "weight": payload.weight,
        "weightUomId": payload.weightUomId,
        "facilityId": payload.facilityId,
        "shipGroupSeqId": payload.shipGroupSeqId
      })
      if(resp.data._EVENT_MESSAGE_) {
        showToast(translate('Order packed and ready for delivery'));
      } 
      dispatch('getOrderdetails',{
        sortBy: 'orderDate',
        sortOrder: 'Desc',
        viewSize: 10,
        viewIndex: 0,
        facilityId: 'STORE_8'
      });
      
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
}

export default actions;