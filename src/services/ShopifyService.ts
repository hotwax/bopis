import { client } from '@/api';

const generateAccessToken = async (config: any): Promise <any>  => {
  return client({
    url: "/generateShopifyAccessToken",
    method: "post",
    ...config
  });
}

export const ShopifyService = {
  generateAccessToken
}