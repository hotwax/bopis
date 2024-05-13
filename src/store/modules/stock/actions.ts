import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import { showToast } from '@/utils'
import { translate } from "@hotwax/dxp-components";
import logger from '@/logger'

const actions: ActionTree<StockState, RootState> = {
  async fetchStock({ commit }, { productId }) {
    try {
      const payload = {
        productId,
        facilityId: this.state.user.currentFacility.facilityId
      }

      const resp: any = await StockService.getInventoryAvailableByFacility(payload);
      if (!hasError(resp)) {
        commit(types.STOCK_ADD_PRODUCT, { productId: payload.productId, facilityId: this.state.user.currentFacility.facilityId, stock: resp.data })
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error(err)
      showToast(translate('No data available!'))
    }
  },

  async fetchInvCount({ commit }, { productId }) {
    try {
     
      const params = {
        "entityName": "ProductFacility",
        "inputFields": {
          productId,
          "facilityId": this.state.user.currentFacility.facilityId
        },
        "fieldList": ["minimumStock", "lastInventoryCount"],
        "viewSize": 1
      } as any
      
      const resp: any = await StockService.getInventoryComputation(params);
      if(!hasError(resp)) {
        commit(types.INVENTORY_COMPUTATIONS, {  productId: productId, facilityId: this.state.user.currentFacility.facilityId, minimumStock: resp.minimumStock, lastInventoryCount: resp.lastInventoryCount})
      }
    }
    catch (err) {
      logger.error(err)
      showToast(translate('No data available!'))
    }
  }
}
export default actions;