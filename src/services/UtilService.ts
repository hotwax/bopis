import { api } from '@/adapter';
import { hasError } from '@/adapter';

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

const fetchReservedQuantity = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query
  });
}

const getProductStoreSettings = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const createProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload
  });
}

const updateProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: "/service/createEnumeration",
    method: "post",
    data: payload
  })
}

const isEnumExists = async (enumId: string): Promise<any> => {
  try {
    const resp = await api({
      url: 'performFind',
      method: 'POST',
      data: {
        entityName: "Enumeration",
        inputFields: {
          enumId
        },
        viewSize: 1,
        fieldList: ["enumId"],
        noConditionFind: 'Y'
      }
    }) as any

    if (!hasError(resp) && resp.data.docs.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

export const UtilService = {
  createEnumeration,
  createProductStoreSetting,
  fetchFacilityTypeInformation,
  fetchPartyInformation,
  fetchPaymentMethodTypeDesc,
  fetchRejectReasons,
  fetchStatusDesc,
  getProductStoreSettings,
  isEnumExists,
  resetPicker,
  updateProductStoreSetting,
  fetchReservedQuantity
}