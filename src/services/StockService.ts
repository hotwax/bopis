import { api } from '@/adapter';

const checkInventory = async (query: any): Promise <any>  => {
  return api({
    url: "checkInventory", 
    method: "post",
    data: query,
    systemType: "OFBIZ"
  });
}

const checkShippingInventory = async (query: any): Promise <any>  => {
  return api({
    url: "ofbiz-oms-usl/checkShippingInventory", 
    method: "post",
    data: query
  });
}

const getInventoryAvailableByFacility = async (params: any): Promise <any> => {
  return api({
    url: "poorti/getInventoryAvailableByFacility",
    method: "get",
    params
  });
}

const fetchProductInventory = async (payload: any ): Promise<any> => {
  return api({
    url: 'performFind',
    method: 'post', 
    data: payload,
    systemType: "OFBIZ"
  });
}

export const StockService = {
  checkInventory,
  checkShippingInventory,
  getInventoryAvailableByFacility,
  fetchProductInventory
}