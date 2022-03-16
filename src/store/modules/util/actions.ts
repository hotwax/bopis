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
  async fetchCountries({ commit }) {
    try {
      const resp = await UtilService.getCountries({
        "inputFields":{
          "geoTypeId": 'COUNTRY',
          "geoTypeId_op": "equals"
        },
        "fieldList": [ "geoId", "geoName" ],
        "entityName": "Geo",
        "noConditionFind": "Y",
        "viewSize": "250"
      });

      if(resp.status === 200 && resp.data.docs.length > 0 && !hasError(resp)) {
        commit(types.UTIL_COUNTRIES_UPDATED, resp.data.docs);
      } else {
        commit(types.UTIL_COUNTRIES_UPDATED, {});
      }
    } catch(err) {
      console.error(err);
    }
  },
  async fetchStates({ commit }, payload) {
    try {
      const resp = await UtilService.getStates({
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
        commit(types.UTIL_STATES_UPDATED, resp.data.docs);
      } else {
        commit(types.UTIL_STATES_UPDATED, {});
      }
    } catch(err) {
      console.error(err);
    }
  }
}

export default actions;