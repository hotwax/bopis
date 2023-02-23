import { api } from '@/adapter';

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: query,
    cache: true
  })
}

const createPicklist = async (query: any): Promise <any> => {
  // TODO: update the endpoint for creating picklist, we can use picklistDataSetup service-multi
  return api({
    url: 'createPicklist',
    method: 'POST',
    data: query
  })
}

export const PicklistService = {
  createPicklist,
  getAvailablePickers
}