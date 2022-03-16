import { MutationTree } from "vuex";
import * as types from "./mutation-types";
import UtilState from "./UtilState";

const mutations: MutationTree<UtilState> = {
  [types.UTIL_SHIPMENT_METHODS_UPDATED](state, payload) {
    state.shipmentMethods = payload;
  },
  [types.UTIL_COUNTRIES_UPDATED](state, payload) {
    state.countries = payload;
  },
  [types.UTIL_STATES_UPDATED](state, payload) {
    state.states = payload;
  }
}

export default mutations;