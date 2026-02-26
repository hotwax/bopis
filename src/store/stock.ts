import { defineStore } from 'pinia'
import { StockService } from '@/services/StockService'
import { hasError } from '@/adapter'
import { commonUtil } from '@/utils/commonUtil'
import logger from '@/logger'

export const useStockStore = defineStore('stock', {
  state: () => ({
    inventoryInformation: {} as any
  }),
  getters: {
    getInventoryInformation: (state) => (productId: any) => {
      const facilityId = commonUtil.getCurrentFacilityId()
      return state.inventoryInformation[productId] ? state.inventoryInformation[productId][facilityId] ? state.inventoryInformation[productId][facilityId] : {} : {};
    }
  },
  actions: {
    async fetchProductInventory({ productId, forceFetchStock = false }: { productId: string, forceFetchStock?: boolean }) {
      const facilityId = commonUtil.getCurrentFacilityId();
      if (!forceFetchStock && this.inventoryInformation[productId] && this.inventoryInformation[productId][facilityId]) {
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

          if (!this.inventoryInformation[productId]) {
            this.inventoryInformation[productId] = {
              [facilityId]: payload
            }
          } else {
            this.inventoryInformation[productId][facilityId] = {
              ...this.inventoryInformation[productId][facilityId],
              ...payload
            }
          }
        } else {
          throw resp.data;
        }
      }
      catch (err) {
        logger.error(err)
      }
    }
  }
})
