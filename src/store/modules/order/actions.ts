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
    if (payload.json.params.start === 0) emitter.emit("presentLoader");
    let resp;

    try {
      const shippingOrdersStatus = store.state.user.shippingOrders;
      if(!shippingOrdersStatus){
        payload.json.filter.push("shipmentMethodTypeId: STOREPICKUP")
      }
      resp = await OrderService.getOpenOrders(payload)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {

        let orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName
            },
            statusId: orderItem.orderStatusId,
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              if (!arr.some((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId
                  }]
                })
              } else {
                const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate
          }
        })

        const total = resp.data.grouped?.orderId?.ngroups;

        this.dispatch('product/getProductInformation', { orders })

        if(payload.json.params.start && payload.json.params.start > 0) orders = state.open.list.concat(orders)
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

    const params = {
      "json": {
        "params": {
          "rows": 10,
          "sort": "orderDate desc",
          "group": true,
          "group.field": "orderId",
          "group.limit": 1000,
          "group.ngroups": true,
          "defType": "edismax",
          "q.op": "AND",
          "qf": "orderId orderName"
        },
        "query":"(**)",
        "filter": ["docType: OISGIR",`orderId: ${payload.orderId}`,"orderTypeId: SALES_ORDER","orderStatusId: ORDER_APPROVED",`facilityId: ${payload.facilityId}`]
      }
    }

    if (payload.orderPartSeqId) {
      params.json.filter.push(`shipGroupSeqId: ${payload.orderPartSeqId}`)
    }
    
    let resp;
    try {
      resp = await OrderService.getOrderDetails(params)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {
        const orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName
            },
            statusId: orderItem.orderStatusId,
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              if (!arr.some((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId
                  }]
                })
              } else {
                const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate
          }
        })

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
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order })
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
      orderId: payload.order?.orderId,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: payload.facilityId,
      shipGroupSeqId: payload.part?.orderPartSeqId
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        const shipmentMethodTypeId = payload.part?.shipmentMethodEnum?.shipmentMethodEnumId
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

    return Promise.all(data.parts[0]?.items.map((item: any) => {
      const params = {
        ...payload,
        'rejectReason': item.reason,
        'facilityId': this.state.user.currentFacility.facilityId,
        'orderItemSeqId': item.orderItemSeqId,
        'shipmentMethodTypeId': data.parts[0].shipmentMethodEnum.shipmentMethodEnumId,
        'quantity': parseInt(item.quantity)
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
  }
}

export default actions;
