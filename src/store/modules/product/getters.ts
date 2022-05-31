import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.cached[productId] ? state.cached[productId] : {};
  },
  getSearchProducts: (state) => {
    return state.products ? state.products : {};
  },
  isScrollable(state) {
    return (
      state.products.list.length > 0 && state.products.list.length < state.products.total
    );
  },
};
export default getters;