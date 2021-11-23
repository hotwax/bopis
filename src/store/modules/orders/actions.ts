import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrdersState from './OrdersState'
// import * as types from './mutation-types'
import { hasError , showToast } from "@/utils";
import { translate } from "@/i18n";
import emitter from '@/event-bus'

const actions: ActionTree<OrdersState , RootState> ={
    async getOrder({ commit , state}, payload){
        // Show loader only when new query and not the infinite scroll
        if (payload.viewIndex === 0) emitter.emit("presentLoader");

        let resp;
        const obj = {
            "sortBy": payload.sortBy,
            "sortOrder": payload.sortOrder,
            "viewSize": payload.viewSize,
            "viewIndex": payload.viewIndex,
        };

        try{
            resp = await OrderService.getOrders(obj)
        }
        catch(error){
            console.log(error)
            showToast(translate("Something went wrong"))
        }

        return resp;

    }
}


export default actions;
