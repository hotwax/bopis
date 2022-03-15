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
          "inputFields":{
            "partyId": "_NA_",
            "roleTypeId": "CARRIER",
            "productStoreId": this.state.user.currentEComStore.productStoreId
          },
          "entityName": "ProductStoreShipmentMethView",
          "fieldList": ["shipmentMethodTypeId", "description"],
          "noConditionFind": "Y",
          "viewSize": 100
        });

        if(resp.status === 200 && !hasError(resp) && !(typeof resp.data === 'string' && resp.data.includes('error')) && resp.data?.docs?.length > 0) {
          commit(types.UTIL_SHIPMENT_METHODS_UPDATED, resp.data.docs);
        }
      }
    } catch(err) {
      console.error(err);
    }
  },
  async fetchCountryOptions({ state, commit }) {
    try {
      const resp = await UtilService.getCountryOptions({
        "inputFields":{
          "geoTypeId": ['COUNTRY'],
          "geoTypeId_op": "in"
        },
        "fieldList": [ "geoId", "geoName" ],
        "entityName": "Geo",
        "noConditionFind": "Y",
        "viewSize": "250"
      });

      if(resp.status === 200 && resp.data.docs.length > 0 && !hasError(resp)) {
        commit(types.UTIL_COUNTRY_OPTIONS_UPDATED, resp.data.docs);
      } else {
        commit(types.UTIL_COUNTRY_OPTIONS_UPDATED, {});
      }
    } catch(err) {
      console.error(err);
    }
  },
  async fetchStateOptions({ state, commit }, payload) {
    try {
      const resp = await UtilService.getStateOptions({
        "inputFields":{
          "geoTypeId": ['STATE', 'PROVINCE'],
          "geoTypeId_op": "in",
          "geoIdFrom": payload.countryId,
        },
        "fieldList": [ "geoId", "geoName" ],
        "entityName": "GeoAssocAndGeoToWithState",
        "noConditionFind": "Y",
        "viewSize": "250"
      });

      if(resp.status === 200 && resp.data?.docs?.length > 0 && !hasError(resp)) {
        commit(types.UTIL_STATE_OPTIONS_UPDATED, resp.data.docs);
      } else {
        commit(types.UTIL_STATE_OPTIONS_UPDATED, {});
      }
    } catch(err) {
      console.error(err);
    }
  }
}

export default actions;