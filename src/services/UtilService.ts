import { api } from '@/adapter';

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    cache: true
  })
}

const fetchPaymentMethodTypeDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  return api({
    url: "/service/resetPicker",
    method: "post",
    data: payload
  })
}

const fetchReservedQuantity = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

export const UtilService = {
  fetchPaymentMethodTypeDesc,
  fetchRejectReasons,
  fetchStatusDesc,
  resetPicker,
  fetchReservedQuantity
}