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

const fetchFacilityTypeInformation = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

const fetchPartyInformation = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query
  });
}

export const UtilService = {
  fetchFacilityTypeInformation,
  fetchPartyInformation,
  fetchPaymentMethodTypeDesc,
  fetchRejectReasons,
  fetchStatusDesc,
  resetPicker
}