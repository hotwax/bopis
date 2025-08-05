import { apiClient } from '@/adapter';
import store from '@/store';

const checkInventory = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "checkInventory", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query
  });
}

const checkShippingInventory = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "ofbiz-oms-usl/checkShippingInventory", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query
  });
}

const getInventoryAvailableByFacility = async (params: any): Promise <any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "poorti/getInventoryAvailableByFacility",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const fetchProductInventory = async (payload: any ): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: 'performFind',
    method: 'post',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },  
    data: payload
  });
}

export const StockService = {
  checkInventory,
  checkShippingInventory,
  getInventoryAvailableByFacility,
  fetchProductInventory
}