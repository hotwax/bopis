import { api } from '@/adapter';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true
  });
}
const findProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts",
    method: "post",
    data: query,
    cache: true
  });
}
const fetchProductComponents = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  })
}
export const ProductService = {
  fetchProducts,
  findProducts,
  fetchProductComponents
}