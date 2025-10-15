import { apiClient } from '@/adapter';
import store from '@/store';

const fetchProducts = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
   // TODO: We can replace this with any API
    url: "searchProducts", 
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query,
    cache: true
  });
}
const findProducts = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
   // TODO: We can replace this with any API
    url: "searchProducts",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query,
    cache: true
  });
}
const fetchProductComponents = async (params: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return await apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  })
}
export const ProductService = {
  fetchProducts,
  findProducts,
  fetchProductComponents
}