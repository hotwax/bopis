import { GetterTree } from "vuex";
import RootState from "@/store/RootState";
import UtilState from "./UtilState";

const getters: GetterTree<UtilState, RootState> = {
  getShipmentMethods: (state) => {
    return state.shipmentMethods;
  },
  getShipmentDescription: (state) => (shipmentMethodTypeId: string) => {
    return state.shipmentMethods.find((data: any) => data.shipmentMethodTypeId === shipmentMethodTypeId)?.description;
  },
  getCountries: (state) => {
    return state.countries;
  },
  getStates: (state) => {
    return state.states;
  },
}

export default getters;