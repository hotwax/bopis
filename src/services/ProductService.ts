import { api } from '@/adapter';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true,
    systemType: "OFBIZ"
  });
}

const findProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "searchProducts",
    method: "post",
    data: query,
    cache: true,
    systemType: "OFBIZ"
  });
}

const fetchProductComponents = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params,
    systemType: "OFBIZ"
  })
}

export const ProductService = {
  fetchProducts,
  findProducts,
  fetchProductComponents
}