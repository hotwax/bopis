import { GetterTree } from "vuex";
import OrderState from "./OrderState"
import RootState from "../../RootState";

const getters: GetterTree<OrderState , RootState> = {
  getOtherItem: (state) => {
    return state.otherItem;
  },
  getOpenOrders: (state) => {
    return state.open.list;
  },
  getCurrent: (state) => {
    return JSON.parse(JSON.stringify(state.current));
  },
  getPackedOrders: (state) => {
    return state.packed.list;
  },
  isPackedOrdersScrollable: (state) => {
    return state.packed.list.length > 0 && state.packed.list.length < state.packed.total
  },
  isOpenOrdersScrollable: (state) => {
    return state.open.list.length > 0 && state.open.list.length < state.open.total
  },
  getCompletedOrders: (state) => {
    return state.completed.list;
  },
  isCompletedOrdersScrollable: (state) => {
    return state.completed.list.length > 0 && state.completed.list.length < state.completed.total
  },
  getShipToStoreIncomingOrders: (state) => {
    return state.shipToStore.incoming.list;
  },
  isShipToStoreIncmngOrdrsScrlbl: (state) => {
    return state.shipToStore.incoming.list.length > 0 && state.shipToStore.incoming.list.length < state.shipToStore.incoming.total
  },
  getShipToStoreReadyForPickupOrders: (state) => {
    return state.shipToStore.readyForPickup.list;
  },
  isShipToStoreRdyForPckupOrdrsScrlbl: (state) => {
    return state.shipToStore.readyForPickup.list.length > 0 && state.shipToStore.readyForPickup.list.length < state.shipToStore.readyForPickup.total
  },
  getShipToStoreCompletedOrders: (state) => {
    return state.shipToStore.completed.list;
  },
  isShipToStoreCmpltdOrdrsScrlbl: (state) => {
    return state.shipToStore.completed.list.length > 0 && state.shipToStore.completed.list.length < state.shipToStore.completed.total
  },
  getOrderItemRejectionHistory: (state) => {
    return state.orderItemRejectionHistory
  },
}

export default getters;