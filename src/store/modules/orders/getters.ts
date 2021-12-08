import { GetterTree } from "vuex";
import OrdersState from "./OrdersState"
import RootState from "../../RootState";

const getters: GetterTree<OrdersState , RootState> = {
  getOrders: (state) => {
    return state.orders.list;
  },
  getCurrent: (state) => {
    return JSON.parse(JSON.stringify(state.current));
  },
  getPackedOrders: (state) => {
    return state.packedOrders;
  }
}

export default getters;