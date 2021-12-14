import { GetterTree } from "vuex";
import OrderState from "./OrderState"
import RootState from "../../RootState";

const getters: GetterTree<OrderState , RootState> = {
  getOrders: (state) => {
    return state.orders.list;
  },
  getCurrent: (state) => {
    return JSON.parse(JSON.stringify(state.current));
  },
  getPackedOrders: (state) => {
    return state.packedOrders.list;
  },
  isPackedOrdersScrollable: (state) => {
    return state.packedOrders.list.length > 0 && state.packedOrders.list.length < state.packedOrders.total
  },
  isOpenOrdersScrollable: (state) => {
    return state.orders.list.length > 0 && state.orders.list.length < state.orders.total
  }
}

export default getters;