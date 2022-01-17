import { GetterTree } from "vuex";
import OrderState from "./OrderState"
import RootState from "../../RootState";

const getters: GetterTree<OrderState , RootState> = {
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
  getOrderDetails (state) {
    return state.order
  }
}

export default getters;