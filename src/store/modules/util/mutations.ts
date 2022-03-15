import { MutationTree } from "vuex";
import * as types from "./mutation-types";
import UtilState from "./UtilState";

const mutations: MutationTree<UtilState> = {
  [types.UTIL_SHIPMENT_METHODS_UPDATED](state, payload) {
    state.shipmentMethods = payload;
  },
  [types.UTIL_COUNTRY_OPTIONS_UPDATED](state, payload) {
    state.country = payload;
  },
  [types.UTIL_STATE_OPTIONS_UPDATED](state, payload) {
    state.state = payload;
  }
}

export default mutations;