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

    try {

      let params = {
        "payload": {
          "facilityId": payload.facilityId,
          "orderId": payload.order?.orderId,
          "shipmentMethodTypeId": "",
          "item": {
            "orderItemSeqId": "",
            "pickerId": "",
            "quantity": ""
          }
        } as any
      }

      return Promise.all(
        params = payload.order?.items.map((item: any) => {
          params.payload.shipmentMethodTypeId = item.shipmentMethodTypeId;
          params.payload.item.orderItemSeqId = item.orderItemSeqId;
          params.payload.item.pickerId = payload.pickerId;
          // TODO: Add dynamic quantity for quantity property
          params.payload.item.quantity = 1

          return PicklistService.createOrderItemPicklist(params)
      })).then((resp) => {
        if(resp.length === payload.order?.items.length) {
          let isPicklistCreated = false;
          
          resp.forEach((response: any) => {
            if (response.status === 200 && response.data?._EVENT_MESSAGE_) {
              isPicklistCreated = true;
            } else {
              isPicklistCreated = false;
            }
          })

          if(!isPicklistCreated) showToast(translate("Can not create picklist"));

          return isPicklistCreated;
        } else {
          showToast(translate("Can not create picklist for each item"));
        }
      })
    } catch(err) {
      showToast(translate("Something went wrong"));
      console.error(err);
    }
  }
}

export default actions;