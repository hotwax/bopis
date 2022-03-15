import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import store from "@/store";

const actions: ActionTree<OrderState , RootState> ={
  async getOpenOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      const shippingOrdersStatus = store.state.user.shippingOrders;
      if(!shippingOrdersStatus){
        payload.shipmentMethodTypeId= "STOREPICKUP"
      }
      resp = await OrderService.getOpenOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let orders = resp.data.docs;
        const total = resp.data.count;

        this.dispatch('product/getProductInformation', { orders })

        if(payload.viewIndex && payload.viewIndex > 0) orders = state.open.list.concat(orders)
        commit(types.ORDER_OPEN_UPDATED, { orders, total })
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async getOrderDetail( { dispatch, state }, payload ) {
    const current = state.current as any
    const orders = state.open.list as any

    if(current.orderId === payload.orderId) { return current }

    if(orders.length) {
      const order = orders.find((order: any) => {
        return order.orderId === payload.orderId;
      })
      if(order) {
        dispatch('updateCurrent', { order })
        return order;
      }
    }
    
    let resp;
    try {
      resp = await OrderService.getOrderDetails(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        const orders = resp.data.docs

        this.dispatch('product/getProductInformation', { orders })
        dispatch('updateCurrent', { order: orders[0] })
      } else {
        showToast(translate("Order not found"))
      }
    } catch (err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }
  },

  updateCurrent ({ commit }, payload) {
    const order = {
      ...payload.order,
      firstName: payload.order.customerName?.split(' ').slice(0, -1).join(" "),
      lastName: payload.order.customerName?.split(' ').slice(-1).join(' '),
      shipmentMethod: payload.order.items[0]?.shipmentMethodTypeId,
      shipGroupSeqId: payload.order?.items[0]?.shipGroupSeqId,
    }

    commit(types.ORDER_CURRENT_UPDATED, { order })
  },

  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
      resp = await OrderService.getPackedOrders(payload)
      if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        let orders = resp.data.docs;

        this.dispatch('product/getProductInformation', { orders })

        const total = resp.data.count;
        if(payload.viewIndex && payload.viewIndex > 0) orders = state.packed.list.concat(orders)
        commit(types.ORDER_PACKED_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
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
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
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
      shipGroupSeqId: payload.shipGroupSeqId
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        const shipmentMethodTypeId = payload.order.items.find((ele: any) => ele.shipGroupSeqId == payload.shipGroupSeqId).shipmentMethodTypeId
        if (shipmentMethodTypeId !== 'STOREPICKUP') {
          // TODO: find a better way to get the shipmentId
          const shipmentId = resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
          await dispatch('packDeliveryItems', shipmentId).then((data) => {
            if (!hasError(data) && !data.data._EVENT_MESSAGE_) showToast(translate("Something went wrong"))
          })
        }
        showToast(translate("Order packed and ready for delivery"))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  // TODO: handle the unfillable items count
  async setUnfillableOrderOrItem ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("rejectOrderItems", payload).then((resp) => {
      const refreshPickupOrders = resp.find((response: any) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
      if (refreshPickupOrders) {
        showToast(translate('All items were canceled from the order') + ' ' + payload.orderId);
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },

  rejectOrderItems ({ commit }, data) {
    const payload = {
      'orderId': data.orderId
    }

    return Promise.all(data.items.map((item: any) => {
      const params = {
        ...payload,
        'rejectReason': item.reason,
        'facilityId': item.facilityId,
        'orderItemSeqId': item.orderItemSeqId,
        'shipmentMethodTypeId': item.shipmentMethodTypeId,
        'quantity': parseInt(item.inventory[0].quantity)
      }
      return OrderService.rejectOrderItem({'payload': params}).catch((err) => { 
        return err;
      })
    }))
  },

  // clearning the orders state when logout, or user store is changed
  clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_PACKED_UPDATED, {orders: {} , total: 0})
  },

  updateShippingInformationItems ({ commit }, data) {
    return Promise.all(data.order.items.map((item: any) => {
      const params = {
        orderId: data.order.orderId,
        facilityId: '_NA_',
        shipmentMethodTypeId: data.params.shipmentMethodTypeId,
        quantity: parseInt(item.inventory[0].quantity),
        itemSeqId: item.orderItemSeqId,
        shippingAddress: data.params.shippingAddress
      }
      return OrderService.updateShippingInformation({'payload': params}).catch((err) => {
        return err;
      })
    }))
  },

  async updateShippingInformation({ dispatch }, payload ) {
    let resp;

    return await dispatch("rejectOrderItems", payload.order).then(async() => {
      await dispatch("updateShippingInformationItems", payload).then((resp) => {
        if (resp.status == 200 && !hasError(resp)) {
          showToast(translate("Shipping information updated for order") + ' ' + payload.order.orderId)
        }
      })
    })
  }
}

export default actions;
