import { apiClient } from '@/adapter';
import { useUserStore } from '@/store/user';

const fetchProducts = async (query: any): Promise<any> => {
  const baseURL = useUserStore().getOmsBaseUrl;
  const omstoken = useUserStore().getUserToken;

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
const findProducts = async (query: any): Promise<any> => {
  const baseURL = useUserStore().getOmsBaseUrl;
  const omstoken = useUserStore().getUserToken;

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
  const baseURL = useUserStore().getOmsBaseUrl;
  const omstoken = useUserStore().getUserToken;

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