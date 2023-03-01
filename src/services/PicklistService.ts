import { api, client } from '@/adapter';
import store from '@/store';

const getAvailablePickers = async (query: any): Promise <any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: query,
    cache: true
  })
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

export const PicklistService = {
  createPicklist,
  getAvailablePickers
}