import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrdersState from './OrdersState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import router from "@/router";

const actions: ActionTree<OrdersState , RootState> ={
  async getOrder ({ commit, state}, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    try {
			resp = await OrderService.getOrders(payload)
			if (resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
				let orders = resp.data.docs;
				const ordersCount = resp.data.count;
				if(payload.viewIndex && payload.viewIndex > 0) orders = state.orders.list.concat(orders)
				commit(types.OPEN_ORDERS_INITIAL, {orders: orders , ordersCount: ordersCount})
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

  updateCurrentOrder ({ commit }, payload){
    commit(types.PRODUCT_CURRENT_UPDATED, { product: payload.product })
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
				commit(types.ORDERS_PACKED_INITIAL, { packedOrders, total })
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
				showToast(translate(`Order delivered to ${order.customerName}`))
				emitter.emit("dismissLoader");
			} else {
				emitter.emit("dismissLoader");
				showToast(translate("Something went wrong"))
			}
    } catch(err) {
			console.log(err)
			emitter.emit("dismissLoader");
			showToast(translate("Something went wrong"))
    }

  	return resp;
	},

	getShipmentMethod({ commit }, payload) {
    /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
        Because we get the shipmentMethodTypeId on items level in wms-orders API.
        As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
    */
    return payload.items.find((ele: any) => ele.shipGroupSeqId == payload.shipGroupSeqId).shipmentMethodTypeId
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
			console.log(resp)
			if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
				const shipmentMethod = await dispatch('getShipmentMethod', {shipGroupSeqId: payload.shipGroup, items: payload.order.items})
				console.log(shipmentMethod);
				if (shipmentMethod !== 'STOREPICKUP') {
					const shipmentId = resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
					dispatch('packDeliveryItems', shipmentId).then((data) => {
						console.log(data)
						if (!hasError(data) && !data.data._EVENT_MESSAGE_) showToast(translate("Something went wrong"))
					})
				}
				emitter.emit("dismissLoader");
				showToast(translate("Order packed and ready for delivery"))
			} else {
				console.log('else')
				emitter.emit("dismissLoader");
				showToast(translate("Something went wrong"))
			}
    } catch(err) {
			console.log(err)
			emitter.emit("dismissLoader");
			showToast(translate("Something went wrong"))
    }

		return resp;
	},

	async unfillableOrderOrItem ({ dispatch }, order) {
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
	}
}

export default actions;
