import { api } from '@/adapter';

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

export const StockService = {
  checkShippingInventory,
  getInventoryAvailableByFacility
}