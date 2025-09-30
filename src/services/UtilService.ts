import { api, apiClient } from '@/adapter';
import { hasError } from '@/adapter';

const fetchRejectReasons = async (query: any): Promise<any> => {
  return api({
    url: "/admin/enums",
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
  return api({
    url: "performFind",
    method: "get",
    params: query,
    systemType: "OFBIZ"
  });
}

const fetchStatusDesc = async (query: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    systemType: "OFBIZ"
  });
}

const resetPicker = async (payload: any): Promise<any> => {
  return api({
    url: "/service/resetPicker",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  })
}

const fetchFacilityTypeInformation = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    systemType: "OFBIZ"
  });
}

const fetchPartyInformation = async (query: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: query,
    systemType: "OFBIZ"
  });
}

const getProductStoreSettings = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const createProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductStoreSetting",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const updateProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const createEnumeration = async (payload: any): Promise<any> => {
  return api({
    url: "/service/createEnumeration",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
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
      },
      systemType: "OFBIZ"
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
  return api({
    url: "/findJobs",
    method: "get",
    params: payload,
    systemType: "OFBIZ"
  });
}

const getProcessRefundStatus = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const fetchEnumerations = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const fetchCurrentFacilityLatLon = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
  });
}

const fetchStoresInformation = async (payload: any): Promise<any> => {
  return api({
    url: "storeLookup",
    method: "post",
    data: payload,
    systemType: "OFBIZ"
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

export const UtilService = {
  activateGiftCard,
  createEnumeration,
  createProductStoreSetting,
  fetchEnumerations,
  fetchFacilities,
  fetchFacilityTypeInformation,
  fetchGiftCardFulfillmentInfo,
  fetchJobInformation,
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