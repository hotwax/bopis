import { GetterTree } from "vuex";
import OrdersState from "./OrdersState"
import RootState from "../../RootState";


const getters: GetterTree<OrdersState , RootState> = {
    getOrders: (state) => {
        return state.orders;
    }
}

export default getters;