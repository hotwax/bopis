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
    return state.packedOrders.list;
  },
  isScrollable: (state) => (segmentSelected: string) => {
    return segmentSelected === 'open' ? (
      state.orders.list.length > 0 &&
      state.orders.list.length < state.orders.total
    ) : (
      state.packedOrders.list.length > 0 &&
      state.packedOrders.list.length < state.packedOrders.total
    );
  }
}

export default getters;