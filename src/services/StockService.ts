import { api, hasError } from '@/adapter';

const checkInventory = async (query: any): Promise <any>  => {
  return api({
    url: "checkInventory", 
    method: "post",
    data: query
  });
}

const getInventoryAvailableByFacility = async (query: any): Promise <any> => {
  return api({
    url: "service/getInventoryAvailableByFacility",
    method: "post",
    data: query
  });
}

const getInventoryComputation = async (payload: any ): Promise<any> => {
  return api({
    url: 'performFind',
    method: 'post',
    data: payload
  });
}

export const StockService = {
  checkInventory,
  getInventoryAvailableByFacility,
  getInventoryComputation
}