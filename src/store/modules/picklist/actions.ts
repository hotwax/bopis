import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PicklistState from './PicklistState'
import * as types from './mutation-types'
import { PicklistService } from '@/services/PicklistService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<PicklistState, RootState> = {
  async getPickers({ commit }, payload) {
    let resp;

    try {
      resp = await PicklistService.getPickers(payload);
      if(resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
        commit(types.PICKLIST_PICKERS_UPDATED, { pickers: resp.data.docs })
      } else {
        showToast(translate('Pickers not found'))
      }
    } catch (err) {
      console.error(translate('Something went wrong'))
    }

    return resp;
  },

  async createOrderItemPicklist({ commit }, payload ) {
    console.log(payload)
    let resp;

    try {

      // const query = {
      //   "payload": {
      //     "facilityId": payload.facilityId,
      //     "orderId": payload.order?.orderId,
      //     "shipmentMethodTypeId": payload.order?.items[0]?.shipmentMethodTypeId,
      //     "item": {
      //       "pickerId": ""
      //     }
      //   }
      // }

      resp = await PicklistService.createOrderItemPicklist(payload);
      if(resp.status === 200 && !hasError(resp)) {
        console.log(resp);



      } else {
        console.log("Error may happen")
      }
    } catch(err) {
      console.error(err);
    }
  }
}

export default actions;