import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import { showToast } from '@/utils'
import { translate } from "@hotwax/dxp-components";
import logger from '@/logger'
import { prepareOrderQuery } from "@/utils/solrHelper";
import { UtilService } from '@/services/UtilService';

const actions: ActionTree<StockState, RootState> = {
  async fetchStock({ commit }, { productId }) {
    try {
      const payload = {
        productId: productId,
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

  async fetchInventoryCount({ commit, state }, { productId }) {
    const facilityId = this.state.user.currentFacility.facilityId;
    if (state.inventoryInformation[productId] && state.inventoryInformation[productId][facilityId]) {
      return; 
    }

    try {
      const params = {
        "entityName": "ProductFacility",
        "inputFields": {
          "productId": productId,
          "facilityId": facilityId
        },
        "fieldList": ["minimumStock", "computedLastInventoryCount"],
        "viewSize": 1
      } as any
      
      const resp: any = await StockService.fetchInventoryCount(params);
      if (!hasError(resp) && resp.data.docs.length > 0) {
        commit(types.STOCK_ADD_PRODUCT_INFORMATION, { productId: productId, facilityId: facilityId, payload: { minimumStock: resp.data.docs[0].minimumStock, onlineAtp: resp.data.docs[0].computedLastInventoryCount }})
      } else {
        throw resp.data;
      }
    }
    catch (err) {
      logger.error(err)
    }
  },

  async fetchReservedQuantity({ commit, state }, { productId }) {
    const facilityId = this.state.user.currentFacility.facilityId;
    if (state.inventoryInformation[productId] && state.inventoryInformation[productId][facilityId]?.reservedQuantity) {
      return;
    }

    const payload = prepareOrderQuery({
      viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
      defType: "edismax",
      filters: {
        facilityId: facilityId,
        productId: productId,
        '-fulfillmentStatus': '(Cancelled OR Rejected OR Completed)',
      },
      facet: {
        "reservedQuantityFacet": "sum(itemQuantity)"
      }
    })

    try {
      const resp = await UtilService.fetchReservedQuantity(payload)
      if (!hasError(resp) && resp.data.facets.count) {
        const reservedQuantity = resp.data.facets.count
        commit(types.STOCK_ADD_PRODUCT_INFORMATION, { productId, facilityId: facilityId, payload: { reservedQuantity }});
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Failed to fetch reserved quantity', err)
    }
  }
}
export default actions;