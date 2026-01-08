import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import OrderState from './OrderState'
import RootState from '../../RootState'


const orderModule: Module<OrderState, RootState> = {
  namespaced: true,
  state: {
    current: {},
    orderItemRejectionHistory: [],
    open: {
      list: {},
      total: 0
    },
    orders: {},
    packed: {
      list: {},
      total: 0
    },
    completed: {
      list: {},
      total: 0
    },
    shipToStore: {
      incoming: {
        list: {},
        orderCount: 0,
        total: 0
      },
      readyForPickup: {
        list: {},
        total: 0,
        orderCount: 0
      },
      completed: {
        list: {},
        total: 0,
        orderCount: 0
      }
    }
  },
  getters,
  actions,
  mutations,
}

export default orderModule;