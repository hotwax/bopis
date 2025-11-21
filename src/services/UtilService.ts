import { api, apiClient } from '@/adapter';
import { hasError } from '@/adapter';
import store from '@/store';
import logger from '@/logger';

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: `/admin/enums`,
    method: "GET",
    params: query
  });
}

const fetchRejectReasonsByEnumerationGroup = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    params: payload
  });
}

const fetchCancelReasons = async (payload: any): Promise<any> => {
  return api({
    url: `/admin/enumGroups/${payload.enumerationGroupId}/members`,
    method: "GET",
    params: payload
  });
}

const fetchPaymentMethodTypeDesc = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "/service/resetPicker",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

const fetchFacilityTypeInformation = async (query: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const fetchPartyInformation = async (query: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: query
  });
}

const getProductStoreSettings = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createProductStoreSetting = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/createProductStoreSetting",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateProductStoreSetting = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "service/updateProductStoreSetting",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "/service/createEnumeration",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

const isEnumExists = async (enumId: string): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  try {
    const resp = await apiClient({
      url: 'performFind',
      method: 'POST',
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
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

const fetchJobInformation = async (payload: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "/findJobs",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const getProcessRefundStatus = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchEnumerations = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchCurrentFacilityLatLon = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "performFind",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchStoresInformation = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "storeLookup",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const fetchGiftCardFulfillmentInfo = async (params: any): Promise<any> => {
  return await api({
    url: 'poorti/giftCardFulfillments',
    method: 'GET',
    params
  }) as any
}

const activateGiftCard = async (payload: any): Promise<any> => {
  return api({
    url: "poorti/giftCardFulfillments",
    method: "post",
    data: payload
  });
}
const fetchPartiesInformation = async (payload: any): Promise<any> => {
  return api({
    url: "oms/parties",
    method: "get",
    params: payload
  });
}

export const UtilService = {
  activateGiftCard,
  createEnumeration,
  createProductStoreSetting,
  fetchEnumerations,
  fetchFacilities,
  fetchFacilityTypeInformation,
  fetchGiftCardFulfillmentInfo,
  fetchJobInformation,
  fetchPartiesInformation,
  fetchPartyInformation,
  fetchPaymentMethodTypeDesc,
  fetchRejectReasons,
  fetchRejectReasonsByEnumerationGroup,
  fetchCancelReasons,
  fetchStatusDesc,
  getProcessRefundStatus,
  getProductStoreSettings,
  isEnumExists,
  resetPicker,
  updateProductStoreSetting,
  fetchCurrentFacilityLatLon,
  fetchStoresInformation
}