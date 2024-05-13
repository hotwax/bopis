import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'
import store from '@/store'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, RootState) => (productId: any) => {
    const facilityId = store.state.user?.currentFacility?.facilityId
    return state.products[productId] ? state.products[productId][facilityId] ? state.products[productId][facilityId] : {} : {}
  },
  getInventoryCount: (state) => {
    return state.count;
  }
}
export default getters;