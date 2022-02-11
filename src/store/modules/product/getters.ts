import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.cached[productId] ? state.cached[productId] : {};
  },
  findProduct: (state) => {
    return state.cached ? state.cached : {};
  },
  isScrollable(state) {
    return (
      state.cached.length > 0 &&
      state.cached.length < state.total
    );
  },
};
export default getters;