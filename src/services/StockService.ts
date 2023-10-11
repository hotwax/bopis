import { api } from '@/adapter';

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

export const StockService = {
  checkInventory,
  getInventoryAvailableByFacility
}