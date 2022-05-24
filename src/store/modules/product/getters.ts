import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.products.cached[productId] ? state.products.cached[productId] : {};
  },
  findProduct: (state) => {
    return state.products ? state.products : {};
  },
  isScrollable(state) {
    return (
      state.products.cached.length > 0 &&
      state.products.cached.length < state.products.total
    );
  },
};
export default getters;