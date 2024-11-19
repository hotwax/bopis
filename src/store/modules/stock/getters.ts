import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'
import { getCurrentFacilityId } from '@/utils'


const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, RootState) => (productId: any) => {
    const facilityId = getCurrentFacilityId()
    return state.products[productId] ? state.products[productId][facilityId] ? state.products[productId][facilityId] : {} : {}
  },
  getInventoryInformation: (state) => (productId: any) => {
    const facilityId = getCurrentFacilityId()
    return state.inventoryInformation[productId] ? state.inventoryInformation[productId][facilityId] ? state.inventoryInformation[productId][facilityId] : {} : {};
  }
}
export default getters;