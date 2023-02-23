import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import PicklistState from './PicklistState'
import RootState from '../../RootState'

const picklistModule: Module<PicklistState, RootState> = {
  namespaced: true,
  state: {
    size: process.env.VUE_APP_VIEW_SIZE, // size of picklist selected from filters on open orders page
    availablePickers: {}
  },
  getters,
  actions,
  mutations
}

export default picklistModule;