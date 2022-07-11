import api from '@/api';

const findProducts = async (query: any): Promise <any>  => {
  return api({
   // TODO: We can replace this with any API
    url: "/solr-query",
    method: "post",
    data: query,
    cache: true
  });
}

export const ProductService = {
  findProducts
}