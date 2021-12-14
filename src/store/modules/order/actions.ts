import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import router from "@/router";

const actions: ActionTree<OrderState , RootState> ={
  async getOpenOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      resp = await OrderService.getOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let orders = resp.data.docs;
        const total = resp.data.count;
        if(payload.viewIndex && payload.viewIndex > 0) orders = state.orders.list.concat(orders)
        commit(types.ORDER_OPEN_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        showToast(translate("Orders Not Found"))
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(err) {
      console.log(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  updateCurrent ({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order })
  },

  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      resp = await OrderService.getPackedOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let packedOrders = resp.data.docs;
        const total = resp.data.count;
        if(payload.viewIndex && payload.viewIndex > 0) packedOrders = state.packedOrders.list.concat(packedOrders)
        commit(types.ORDER_PACKED_UPDATED, { packedOrders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        showToast(translate("Orders Not Found"))
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(err) {
      console.log(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async deliverShipment ({ dispatch }, order) {
    emitter.emit("presentLoader");

    const params = {
      shipmentId: order.shipmentId,
      statusId: 'SHIPMENT_SHIPPED'
    }

    let resp;

    try {
      resp = await OrderService.updateShipment(params)
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate('Order delivered to', {customerName: order.customerName}))
      } else {
        showToast(translate("Something went wrong"))
      }
    } catch(err) {
      console.log(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  async packDeliveryItems ({ commit }, shipmentId) {
    const params = {
      shipmentId: shipmentId,
      statusId: 'SHIPMENT_PACKED'
    }
    return await OrderService.updateShipment(params)
  },

  async quickShipEntireShipGroup ({ dispatch }, payload) {
    emitter.emit("presentLoader")

    const params = {
      orderId: payload.order.orderId,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: payload.facilityId,
      shipGroupSeqId: payload.shipGroup
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        const shipmentMethod = payload.order.items.find((ele: any) => ele.shipGroupSeqId == payload.shipGroup).shipmentMethodTypeId
        if (shipmentMethod !== 'STOREPICKUP') {
          const shipmentId = resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
          await dispatch('packDeliveryItems', shipmentId).then((data) => {
            if (!hasError(data) && !data.data._EVENT_MESSAGE_) showToast(translate("Something went wrong"))
          })
        }
        showToast(translate("Order packed and ready for delivery"))
      } else {
        showToast(translate("Something went wrong"))
      }
    } catch(err) {
      console.log(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  async setUnfillableOrderOrItem ({ dispatch }, order) {
    emitter.emit("presentLoader");
    await dispatch("rejectOrderItems", order).then((resp) => {
      let unfillableItems = 0;
      const refreshPickupOrders = resp.find((response: any) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
      if (refreshPickupOrders) {
        unfillableItems++;
        showToast(`${unfillableItems} ${unfillableItems == 1 ? translate('item was') : translate('items were')}` + ' ' + translate('canceled from the order') + ' ' + order.orderId);
        router.push('/tabs/orders')
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
    })
  },

  rejectOrderItems ({ commit }, order) {
    const params: any = {
      "payload": {
        "orderId": order.orderId,
        "rejectReason": ''
      }
    }

    return Promise.all(order.items.map((item: any) => {
      params['payload']['facilityId'] = item.facilityId
      params['payload']['orderItemSeqId'] = item.orderItemSeqId
      params['payload']['shipmentMethodTypeId'] = item.shipmentMethodTypeId
      params['payload']['quantity'] = parseInt(item.inventory[0].quantity)
      return OrderService.rejectOrderItem(params).catch((err) => { 
        throw err;
      })
    }))
  },

  // clearning the orders state when logout, or user store is changed
  clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_PACKED_UPDATED, {packedOrders: {} , total: 0})
  }
}

export default actions;
