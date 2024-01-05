import { GetterTree } from 'vuex'
import StockState from './StockState'
import RootState from '../../RootState'
import store from '@/store'

const getters: GetterTree <StockState, RootState> = {
  getProductStock: (state, RootState) => (productId: any) => {
    const facilityId = store.state.user?.currentFacility?.facilityId
    console.log(facilityId);
    console.log(productId);
    if(state.products[productId]) {
      console.log('res', state.products[productId][facilityId]);
    }
    
    
    return state.products[productId] ? state.products[productId][facilityId] ? state.products[productId][facilityId] : {} : {}
  }
}
export default getters;