import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import store from "@/store";
import { Order, OrderItem, OrderItemGroup, Product } from "@/types";

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
        let orders: Order = resp.data.docs.map((order: any) => ({
          id: order.orderId,
          name: order.orderName,
          customer: {
            id: order.customerId,
            name: order.customerName
          },
          items: order.items.map((item: any) => ({
            orderItemGroupId: item.shipGroupSeqId,
            id: item.orderItemSeqId,
            product: {
              id: item.itemId,
              name: item.itemName,
              brand: item.brandName,
              mainImage: item.images.main.thumbnail,
              assets: Object.values(item.images.main),
              feature: item.standardFeatures
            } as Product,
            statusId: item.statusId
          })) as OrderItem[],
          itemGroup: order.items.reduce((arr: OrderItemGroup[], item: any) => {
            if (!arr.includes(item.shipGroupSeqId)) {
              arr.push({
                id: item.shipGroupSeqId,
                shippingMethod: {
                  id: item.shipmentMethodTypeId
                }
              })
            }

            return arr
          }, []) as OrderItemGroup,
          statusId: order.statusId,
          identifications: order.orderIdentifications,
          orderDate: order.orderDate
        }));

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

    if(current.id === payload.orderId) { return current }

    if(orders.length) {
      const order = orders.find((order: any) => {
        return order.id === payload.orderId;
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

        const orders: Order[] = resp.data.docs.map((order: any) => ({
          id: order.orderId,
          name: order.orderName,
          customer: {
            id: order.customerId,
            name: order.customerName
          },
          items: order.items.map((item: any) => ({
            orderItemGroupId: item.shipGroupSeqId,
            id: item.orderItemSeqId,
            product: {
              id: item.itemId,
              name: item.itemName,
              brand: item.brandName,
              mainImage: item.images.main.thumbnail,
              assets: Object.values(item.images.main),
              feature: item.standardFeatures
            } as Product,
            statusId: item.statusId
          })) as OrderItem[],
          itemGroup: order.items.reduce((arr: OrderItemGroup[], item: any) => {
            if (!arr.includes(item.shipGroupSeqId)) {
              arr.push({
                id: item.shipGroupSeqId,
                shippingMethod: {
                  id: item.shipmentMethodTypeId
                }
              })
            }

            return arr
          }, []) as OrderItemGroup,
          statusId: order.statusId,
          identifications: order.orderIdentifications,
          orderDate: order.orderDate
        }));

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
        let orders: Order = resp.data.docs.map((order: any) => ({
          id: order.orderId,
          name: order.orderName,
          customer: {
            id: order.customerId,
            name: order.customerName
          },
          items: order.items.map((item: any) => ({
            orderItemGroupId: item.shipGroupSeqId,
            id: item.orderItemSeqId,
            product: {
              id: item.itemId,
              name: item.itemName,
              brand: item.brandName,
              mainImage: item.images.main.thumbnail,
              assets: Object.values(item.images.main),
              feature: item.standardFeatures
            } as Product,
            statusId: item.statusId
          })) as OrderItem[],
          itemGroup: order.items.reduce((arr: OrderItemGroup[], item: any) => {
            if (!arr.includes(item.shipGroupSeqId)) {
              arr.push({
                id: item.shipGroupSeqId,
                shippingMethod: {
                  id: item.shipmentMethodTypeId
                }
              })
            }

            return arr
          }, []) as OrderItemGroup,
          statusId: order.statusId,
          identifications: order.orderIdentifications,
          shipmentId: order.shipmentId
        }));

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
      orderId: payload.order.id,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: payload.facilityId,
      shipGroupSeqId: payload.shipGroup.id
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        if (payload.shipGroup.shippingMethod.id !== 'STOREPICKUP') {
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
        showToast(translate('All items were canceled from the order') + ' ' + payload.id);
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },

  rejectOrderItems ({ commit }, data) {
    const payload = {
      'orderId': data.id
    }

    return Promise.all(data.items.map((item: any) => {
      const params = {
        ...payload,
        'rejectReason': item.reason,
        'facilityId': item.facilityId, // missing in updated type format
        'orderItemSeqId': item.orderItemSeqId,
        'shipmentMethodTypeId': data.itemGroup.find((group: OrderItemGroup) => group.id === item.orderItemGroupId).shippingMethod.id,
        'quantity': parseInt(item.quantity) // missing in updated type format
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
