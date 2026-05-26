import { defineStore } from 'pinia'
import { api, commonUtil, logger } from '@common'
import { useProductStore } from "@/store/productStore";

export const useStockStore = defineStore('stock', {
  state: () => ({
    inventoryInformation: {} as any
  }),
  getters: {
    getInventoryInformation: (state) => (productId: any) => {
      const facilityId = useProductStore().getCurrentFacility?.facilityId;
      return state.inventoryInformation[productId] ? state.inventoryInformation[productId][facilityId] ? state.inventoryInformation[productId][facilityId] : {} : {};
    }
  },
  actions: {
    async checkShippingInventory(query: any): Promise<any> {
      return api({
        url: "ofbiz-oms-usl/checkShippingInventory",
        method: "post",
        data: query
      });
    },
    async fetchProductInventory({ productId, forceFetchStock = false }: { productId: string, forceFetchStock?: boolean }) {
      const facilityId = useProductStore().getCurrentFacility?.facilityId;
      if (!forceFetchStock && this.inventoryInformation[productId] && this.inventoryInformation[productId][facilityId]) {
        return;
      }

      try {
        const params = {
          productId: productId,
          facilityId: facilityId
        }

        const resp: any = await api({
          url: "poorti/getInventoryAvailableByFacility",
          method: "get",
          params
        });
        if (!commonUtil.hasError(resp) && resp.data) {
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
