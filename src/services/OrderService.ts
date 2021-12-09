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

const updateShipment = async (payload: any): Promise <any> => {
  return api({
    url: "updateShipment",
    method: "post",
    data: payload
  });
}

const quickShipEntireShipGroup = async (payload: any): Promise <any> => {
  return api({
    url: "quickShipEntireShipGroup",
    method: "post",
    data: payload
  });
}

const rejectOrderItem = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  getOrders,
  getPackedOrders,
  quickShipEntireShipGroup,
  rejectOrderItem,
  updateShipment
}