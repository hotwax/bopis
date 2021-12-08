import api from '@/api'

const getOrders = async (payload: any): Promise <any> => {
  return api({
    url: "wms-orders",
    method: "post",
    data: payload
  });
}

const getPackedOrders = async (payload: any): Promise <any> => {
  return api({
    url: "readytoshiporders",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  getOrders,
  getPackedOrders
}