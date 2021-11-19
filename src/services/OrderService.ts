import api from '@/api'

const getOrders = async (payload: any): Promise <any> => {
    return api({
        url: "wms-orders",
        method: "get",
        data: payload
    })
}

export const OrderService = {
    getOrders
}