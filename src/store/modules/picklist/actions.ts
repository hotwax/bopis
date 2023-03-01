import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import PicklistState from './PicklistState'
import * as types from './mutation-types'
import { PicklistService } from '@/services/PicklistService'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<PicklistState, RootState> = {
  async createPicklist ({ commit }, payload) {
    let resp;
    
    const items = payload.order.parts[0].items;
    const formData = new FormData();
    formData.append("facilityId", items[0].facilityId);
    items.map((item: any) => {
      formData.append("itemStatusId_o_"+items.indexOf(item), "PICKITEM_PENDING")
      formData.append("pickerIds_o_"+items.indexOf(item), payload.selectedPicker)
      Object.keys(item).map((property) => {
        if(property !== "facilityId") formData.append(property+'_o_'+items.indexOf(item), item[property])
      })
    });
    
    try {
      resp = await PicklistService.createPicklist(formData);
      if (resp.status === 200 && !hasError(resp) && resp.data) {
        this.dispatch('order/quickShipEntireShipGroup', { order: payload.order, part: payload.order.parts[0], facilityId: items[0].facilityId });
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
    }
  }
}

export default actions;