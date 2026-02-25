import { apiClient } from '@/adapter';
import { useUserStore } from '@/store/user';

const getAvailablePickers = async (query: any): Promise<any> => {
  const baseURL = useUserStore().getOmsBaseUrl;
  const omstoken = useUserStore().getUserToken;

  return apiClient({
    url: "solr-query",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query
  });
}



export const PicklistService = {
  getAvailablePickers
}