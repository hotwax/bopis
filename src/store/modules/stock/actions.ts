import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import { getCurrentFacilityId } from '@/utils'
import logger from '@/logger'

const actions: ActionTree<StockState, RootState> = {
  async fetchProductInventory({ commit, state }, { productId, forceFetchStock = false }) {
    const facilityId = getCurrentFacilityId();
    if (!forceFetchStock && state.inventoryInformation[productId] && state.inventoryInformation[productId][facilityId]) {
      return; 
    }

    try {
     const params = {
        productId: productId,
        facilityId: facilityId
      }
      
      const resp: any = await StockService.getInventoryAvailableByFacility(params);      
      if (!hasError(resp) && resp.data) {
        const payload = {
          minimumStock: resp.data.minimumStock,
          quantityOnHand: resp.data.qoh,
          reservedQuantity: (resp.data.qoh - resp.data.atp) > 0 ? (resp.data.qoh - resp.data.atp) : 0,
          onlineAtp: resp.data.computedAtp,
        }
        commit(types.STOCK_ADD_PRODUCT_INFORMATION, { productId: productId, facilityId: facilityId, payload: payload });
      } else {
        throw resp.data;
      }
    }
    catch (err) {
      logger.error(err)
    }
  }
}
export default actions;