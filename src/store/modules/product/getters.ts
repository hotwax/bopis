import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getOrderdetails(state){
    return state.products.details;
  },
  isScrollable(state) {
    return (
      state.products.details.length > 0 &&
      state.products.details.length < state.products.total
    );
  }
};
export default getters;