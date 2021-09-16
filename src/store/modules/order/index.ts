import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '../../RootState'

const orderModule: Module<OrderState, RootState> = {
    namespaced: true,
    state: {
      orders: {
        details: {},
        total: 0
      }
    },
    getters,
    actions,
    mutations,
}

export default orderModule;