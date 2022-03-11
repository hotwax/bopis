import { GetterTree } from "vuex";
import RootState from "@/store/RootState";
import UtilState from "./UtilState";

const getters: GetterTree<UtilState, RootState> = {
  getShipmentMethods: (state) => {
    return state.shipmentMethods;
  }
}

export default getters;