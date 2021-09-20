import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import orderState from './OrderState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<orderState, RootState> = {

  // Fetch order details
  async getOrdersList ({ commit, state }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await OrderService.fetchOrdersList(payload)
      // resp.data.docs the number of items in the response
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let orders = resp.data.docs;
        const total = resp.data.count;
        if (payload.viewIndex && payload.viewIndex > 0) orders = state.orders.details.concat(orders)
        commit(types.ORDERS_DETAILS, { orders: orders, total: total })
      } else {
        //showing error whenever getting no orders in the response or having any other error
        showToast(translate("Orders not found"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },
  async quickShipEntireShipGroup ({ dispatch }, payload) {
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await OrderService.fetchEntireShipGroup(payload)
      if(resp.data._EVENT_MESSAGE_) {
        showToast(translate('Order packed and ready for delivery'));
      } 
      dispatch('getOrdersList',{
        sortBy: 'orderDate',
        sortOrder: 'Desc',
        viewSize: 10,
        viewIndex: 0,
        facilityId: 'STORE_8'
      });
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