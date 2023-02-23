import { GetterTree } from "vuex";
import PicklistState from "./PicklistState";
import RootState from "../../RootState";

const getters: GetterTree<PicklistState, RootState> = {
  getPicklistSize (state) {
    return state.size;
  },
  getAvailablePickers (state) {
    return state.availablePickers;
  }
};
export default getters;