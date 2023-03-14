import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getCurrent: (state) => {
    return state.current
  },
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.cached[productId] ? state.cached[productId] : {};
  },
  getProducts: (state) => {
    return state.products
  },
  isScrollable(state) {
    return (
      state.products.list.length > 0 && state.products.list.length < state.products.total
    );
  },
  getQueryString(state) {
    return state.products.queryString
  }
};
export default getters;