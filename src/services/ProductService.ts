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
export const ProductService = {
  fetchProducts,
  findProducts
}