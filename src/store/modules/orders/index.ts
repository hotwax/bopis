import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrdersState from './OrdersState'
import RootState from '../../RootState'


const ordersModule: Module<OrdersState, RootState> = {
    namespaced: true,
    state: {
        orders: {
            list: {},
            totalCount: 0
        }
    },
    getters,
    actions,
    mutations,
}

export default ordersModule;