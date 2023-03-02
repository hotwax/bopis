import { api } from '@/adapter';

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: query,
    cache: true
  })
}



export const PicklistService = {
  getAvailablePickers
}