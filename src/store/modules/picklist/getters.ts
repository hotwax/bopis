import { GetterTree } from "vuex";
import PicklistState from "./PicklistState";
import RootState from "../../RootState";

const getters: GetterTree<PicklistState, RootState> = {
  getPickers(state) {
    return state.pickers;
  }
};
export default getters;