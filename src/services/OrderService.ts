import api from '@/api';

const fetchOrdersList = async (query: any): Promise <any>  => {
  return api({
    url: "wms-orders", 
    method: "post",
    data: query,
    cache: true
  });
}

const fetchEntireShipGroup = async (query: any): Promise <any>  => {
  return api({
    url: "quickShipEntireShipGroup", 
    method: "post",
    data: query,
    cache: true
  });
}

export const OrderService = {
  fetchOrdersList,
  fetchEntireShipGroup
}