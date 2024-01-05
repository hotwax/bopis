import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'

const utilModule: Module<UtilState, RootState> = {
  namespaced: true,
  state: {
    rejectReasons: [],
    paymentMethodTypeDesc: {},
    statusDesc: {},
    facilityTypeDesc: {},
    partyNames: {},
  },
  getters,
  actions,
  mutations,
}
export default utilModule;