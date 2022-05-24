import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.products[productId] ? state.products[productId] : {};
  },
  findProduct: (state) => {
    return state.products ? state.products : {};
  },
  isScrollable(state) {
    return (
      state.products.length > 0 &&
      state.products.length < state.total
    );
  },
};
export default getters;