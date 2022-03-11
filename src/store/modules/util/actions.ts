import { ActionTree } from "vuex";
import RootState from '@/store/RootState';
import UtilState from "./UtilState";
import * as types from "./mutation-types"
import { hasError } from "@/utils";
import "moment-timezone";
import { UtilService } from "@/services/UtilService";

const actions: ActionTree<UtilState, RootState> = {
  async fetchShipmentMethods({ state, commit }) {
    try {
      if (Object.keys(state.shipmentMethods).length === 0) {
        const resp = await UtilService.getShipmentMethods({
          "entityName": "ShipmentMethodType",
          "noConditionFind": "Y",
          "fieldList": ["shipmentMethodTypeId", "description"],
          "viewSize": 100
        });

        if(resp.status === 200 && resp.data.docs.length > 0 && !hasError(resp)) {
          commit(types.UTIL_SHIPMENT_METHODS_UPDATED, resp.data.docs);
        }
      }
    } catch(err) {
      console.error(err);
    }
  }
}

export default actions;