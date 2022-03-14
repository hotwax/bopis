import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import PicklistState from './PicklistState'
import RootState from '../../RootState'

const picklistModule: Module<PicklistState, RootState> = {
  namespaced: true,
  state: {
    pickers: {}
  },
  getters,
  actions,
  mutations
}

export default picklistModule;