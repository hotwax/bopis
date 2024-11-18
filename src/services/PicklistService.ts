import { api } from '@/adapter';

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query,
  })
}



export const PicklistService = {
  getAvailablePickers
}