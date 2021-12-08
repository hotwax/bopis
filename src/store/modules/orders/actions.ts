import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrdersState from './OrdersState'
import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'

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
				if(payload.viewIndex && payload.viewIndex > 0) orders = state.orders.concat(orders)
				commit(types.OPEN_ORDERS_INITIAL, {orders: orders , ordersCount: ordersCount})
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
				// const ordersCount = resp.data.count;
				if(payload.viewIndex && payload.viewIndex > 0) packedOrders = state.packedOrders.concat(packedOrders)
				commit(types.ORDERS_PACKED_INITIAL, { packedOrders })
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

	quickShipEntireShipGroup ({ commit }) {
		console.log('ship group action')
	}
}

export default actions;
