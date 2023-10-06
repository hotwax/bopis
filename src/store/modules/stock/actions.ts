import { StockService } from '@/services/StockService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import StockState from './StockState'
import * as types from './mutation-types'
import { hasError } from '@/adapter'
import { showToast } from '@/utils'
import { translate } from '@/i18n'

const actions: ActionTree<StockState, RootState> = {
  async fetchStock({ commit }, { productId }) {
    try {
      const payload = {
        productId,
        facilityId: this.state.user.currentFacility.facilityId
      }

      const resp: any = await StockService.getInventoryAvailableByFacility(payload);
      if (!hasError(resp)) {
        commit(types.STOCK_ADD_PRODUCT, { productId: payload.productId, stock: resp.data })
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error(err)
      showToast(translate('No data available!'))
    }
  }
}
export default actions;