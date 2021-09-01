import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getOrderdetails(state){
    return state.products.details;
  }
};
export default getters;