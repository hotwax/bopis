import api from '@/api';

const fetchOrders = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "wms-orders", 
    method: "post",
    data: query,
    cache: true
  });
}

export const ProductService = {
  fetchOrders
}