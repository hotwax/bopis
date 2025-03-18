import { api } from '@/adapter';
import { hasError } from '@/adapter';
import logger from '@/logger';

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

const fetchJobInformation = async (payload: any): Promise <any>  => {
  return api({
    url: "/findJobs",
    method: "get",
    params: payload
  });
}

const getProcessRefundStatus = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const fetchFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const fetchEnumerations = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const fetchCurrentFacilityLatLon = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const fetchStoresInformation = async (payload: any): Promise<any> => {
  return api({
    url: "storeLookup",
    method: "post",
    data: payload
  });
}

const fetchGiftCardFulfillmentInfo = async (payload: any): Promise<any> => {
  return await api({
    url: 'performFind',
    method: 'POST',
    data: payload
  }) as any
}

const activateGiftCard = async (payload: any): Promise<any> => {
  return api({
    url: "service/createGcFulFillmentRecord",
    method: "post",
    data: payload
  });
}

const fetchGiftCardItemPriceInfo = async (payload: any): Promise<any> => {
  // Todo: find a better alternative for fetching unitPrice and currency together
  let resp = {} as any;
  const itemPriceInfo = {} as any;

  const params = {
    inputFields: {
      orderId: payload.orderId,
      orderItemSeqId: payload.orderItemSeqId
    },
    entityName: "OrderItem",
    fieldList: ["unitPrice"],
    viewSize: 1
  }

  try {
    resp = await api({
      url: "performFind",
      method: "post",
      data: params
    });

    if(!hasError(resp)) {
      itemPriceInfo.unitPrice = resp.data.docs[0].unitPrice

      resp = await api({
        url: "performFind",
        method: "post",
        data: {
          inputFields: {
            orderId: payload.orderId,
            orderItemSeqId: payload.orderItemSeqId
          },
          entityName: "OrderHeader",
          fieldList: ["currencyUom"],
          viewSize: 1
        }
      });

      if(!hasError(resp)) {
        itemPriceInfo.currencyUom = resp.data.docs[0].currencyUom
      } else {
        throw resp.data;
      }
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error);
  }

  return itemPriceInfo;
}

export const UtilService = {
  activateGiftCard,
  createEnumeration,
  createProductStoreSetting,
  fetchEnumerations,
  fetchFacilities,
  fetchFacilityTypeInformation,
  fetchGiftCardFulfillmentInfo,
  fetchGiftCardItemPriceInfo,
  fetchJobInformation,
  fetchPartyInformation,
  fetchPaymentMethodTypeDesc,
  fetchRejectReasons,
  fetchStatusDesc,
  getProcessRefundStatus,
  getProductStoreSettings,
  isEnumExists,
  resetPicker,
  updateProductStoreSetting,
  fetchReservedQuantity,
  fetchCurrentFacilityLatLon,
  fetchStoresInformation
}