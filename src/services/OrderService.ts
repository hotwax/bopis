import { api, client } from '@/adapter';
import store from '@/store';

const getOpenOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getOrderDetails = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getPackedOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getCompletedOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
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

const createPicklist = async (query: any): Promise <any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: 'createPicklist',
    method: 'POST',
    data: query,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

export const OrderService = {
  getOpenOrders,
  getOrderDetails,
  getCompletedOrders,
  getPackedOrders,
  quickShipEntireShipGroup,
  rejectOrderItem,
  updateShipment,
  createPicklist
}