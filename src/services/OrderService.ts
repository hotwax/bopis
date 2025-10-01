import { api, apiClient, hasError } from '@/adapter';
import emitter from '@/event-bus';
import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import { formatPhoneNumber, getCurrentFacilityId, showToast } from '@/utils';
import logger from '@/logger';
import { cogOutline } from 'ionicons/icons';
import { UtilService } from "@/services/UtilService";

const getOpenOrders = async (params: any): Promise <any> => {

  return api({
    url: "oms/orders/pickup",
    method: "get",
    params
  });
}

const fetchOrderDetails = async (orderId: string): Promise<any> => {

  return api({
    url: `oms/orders/${orderId}`,
    method: "get",
  });
}

const fetchOrderItems = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "solr-query",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const getOrderDetails = async (payload: any): Promise <any> => {
  return await api({
    url: `oms/orders/${payload.orderId}`,
    method: "GET",
    data: payload
  });
}

const fetchPicklists = async (payload: any): Promise <any>  => {
  return api({
    url: `poorti/shipmentPicklists`,
    method: "GET",
    params: payload
  });
}

const getPackedOrders = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "solr-query",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const findPackedShipments = async (params: any): Promise <any>  => {
  params = {
    statusId: 'SHIPMENT_PACKED',
    originFacilityId: getCurrentFacilityId(),
    shipmentTypeId: 'SALES_SHIPMENT',
    keyword: params.keyword,
    orderBy: '-orderDate',
    pageSize: process.env.VUE_APP_VIEW_SIZE,
    pageIndex: params.viewIndex || 0
  } as any

  if(!store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS']) {
    params.shipmentMethodTypeIds = 'STOREPICKUP'
  }

  return await api({
    url: `/poorti/shipments`,
    method: "GET",
    params
  }) as any;
}

const findCompletedShipments = async (params:any): Promise <any>  => {
  params = {
    statusId: 'SHIPMENT_SHIPPED',
    originFacilityId: getCurrentFacilityId(),
    shipmentTypeId: 'SALES_SHIPMENT',
    keyword: params.keyword,
    orderBy: '-orderDate',
    pageSize: process.env.VUE_APP_VIEW_SIZE,
    pageIndex: params.viewIndex || 0
  } as any

  if(!store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS']) {
    params.shipmentMethodTypeIds = 'STOREPICKUP'
  }

  return await api({
    url: `/poorti/shipments`,
    method: "GET",
    params
  }) as any;
}

const getCompletedOrders = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "solr-query",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const updateShipment = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "updateShipment",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const quickShipEntireShipGroup = async (payload: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "quickShipEntireShipGroup",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const rejectOrderItems = async (payload: any): Promise <any> => {
  return api({
    url: "poorti/rejectOrderItems",
    method: "post",
    data: payload
  });
}

const createPicklist = async (payload: any): Promise <any> => {
  return api({
    url: `/poorti/createOrderFulfillmentWave`,
    method: "POST",
    data: payload
  });
}

const printPicklist = async (picklistId: string): Promise<any> => {
  try {
    const baseURL = store.getters['user/getMaargUrl'];
    const omstoken = store.getters['user/getUserToken'];

    const resp = await apiClient({
      url: "/fop/apps/pdf/PrintPicklist",
      method: "GET",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      responseType: "blob",
      params: { picklistId }
    });
    
    if (!resp || hasError(resp)) {
      throw resp?.data;
    }
  
    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
    }
  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to print picklist", err)
  }
}

const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    const baseURL = store.getters['user/getMaargUrl'];
    const omstoken = store.getters['user/getUserToken'];

    const resp = await apiClient({
      url: "fop/apps/pdf/PrintPackingSlip",
      baseURL,
      method: "GET",
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      params: {
        shipmentId: shipmentIds
      },
      responseType: "blob"
    });


    if (!resp || hasError(resp)) {
      throw resp?.data
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'packing slip'}), { icon: cogOutline });
    }

  } catch (err) {
    showToast(translate('Failed to print packing slip'))
    logger.error("Failed to load packing slip", err)
  }
}

const sendPickupScheduledNotification = async (payload: any): Promise <any> => {
  payload = {
    "emailType": "READY_FOR_PICKUP",
    ...payload
  }
  return api({
    url: "oms/orders/pickupScheduledNotification",
    method: "post",
    data: payload
  });
}

const getShipToStoreOrders = async (query: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: 'performFind',
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: query
  })
}

const getShipmentItems = async (shipmentIds: any): Promise<any> => {
  if (!shipmentIds.length) return []
  const requests = []

  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  const shipmentIdList = shipmentIds
  while (shipmentIdList.length) {
    const batch = shipmentIdList.splice(0, 20)
    const params = {
      inputFields: {
        shipmentId: batch
      },
      viewSize: 250, // maximum view size
      entityName: 'ShipmentItem',
      noConditionFind: "Y",
      fieldList: ['shipmentId', 'productId', 'shipmentItemSeqId']
    }
    requests.push(params)
  }

  const shipmentItemsResps = await Promise.all(requests.map((params) => apiClient({
    url: 'performFind',
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: params
  })))

  const hasFailedResponse = shipmentItemsResps.some((response: any) => hasError(response) && response.data.error !== "No record found")

  if (hasFailedResponse) return Promise.reject(shipmentItemsResps);

  return shipmentItemsResps.reduce((responseData: any, response: any) => {
    if (!hasError(response)) responseData.push(...response.data.docs)
    return responseData
  }, [])
}

const getOrderItemRejectionHistory = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: 'performFind',
    method: 'POST',
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
}

const fetchOrderPaymentPreferences = async (params: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return await apiClient({
    url: "performFind",
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    params
  });
}

const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  try {
    // Get packing slip from the server
    const resp: any = await apiClient({
      method: 'get',
      url: 'LabelAndPackingSlip.pdf',
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
      },
      params: {
        shipmentIds
      },
      responseType: "blob"
    })

    if (!resp || resp.status !== 200 || hasError(resp)) {
      throw resp.data;
    }

    // Generate local file URL for the blob received
    const pdfUrl = window.URL.createObjectURL(resp.data);
    // Open the file in new tab
    try {
      (window as any).open(pdfUrl, "_blank").focus();
    }
    catch {
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'shipping label and packing slip'}));
    }

  } catch (err) {
    showToast(translate('Failed to print shipping label and packing slip'))
    logger.error("Failed to load shipping label and packing slip", err)
  }
}

const findOrderShipGroup = async (query: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

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

const fetchTrackingCodes = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentTrackingCodes = [];
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  const params = {
    "entityName": "ShipmentPackageRouteSeg",
    "inputFields": {
      "shipmentId": shipmentIds,
      "shipmentId_op": "in",
      "shipmentItemSeqId_op": "not-empty"
    },
    "fieldList": ["shipmentId", "shipmentPackageSeqId", "trackingCode"],
    "viewSize": 250,  // maximum records we could have
    "distinct": "Y"
  }

  try {
    const resp = await apiClient({
      url: "performFind",
      method: "get",
      baseURL,
      headers: {
       "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
      params
    })

    if (!hasError(resp)) {
      shipmentTrackingCodes = resp?.data.docs;
    } else if (!resp?.data.error || (resp.data.error && resp.data.error !== "No record found")) {
      return Promise.reject(resp?.data.error);
    }
  } catch (err) {
    console.error('Failed to fetch tracking codes for shipments', err)
  }

  return shipmentTrackingCodes;
}

const packOrder = async (payload: any): Promise<any> => {  
  return await api({
    url: `poorti/shipments/${payload.shipmentId}/pack`,
    method: "POST",
    data: payload,
  });
}

const shipOrder = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/shipments/${payload.shipmentId}/ship`,
    method: "POST",
    data: payload
  });
}

const performFind = async (payload: any): Promise<any> => {
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

const cancelOrder = async (payload: any): Promise<any> => {
  return api({
    url: `oms/orders/${payload.orderId}/items/cancel`,
    method: "post",
    data: payload
  });
}

const updateGiftCardActivationDetails = (item: any, giftCardActivationInfo: any, orderId?: string) => {
  const activationRecord = giftCardActivationInfo.find((activationInfo: any) => {
    return (orderId ? activationInfo.orderId === orderId : activationInfo.orderId === item.orderId) && activationInfo.orderItemSeqId === item.orderItemSeqId;
  })

  if(activationRecord?.cardNumber) {
    item.isGCActivated = true;
    item.gcInfo = activationRecord;
  }

  return item;
}

const fetchGiftCardActivationDetails = async ({ isDetailsPage, currentOrders }: any): Promise<any> => {
  let orders = JSON.parse(JSON.stringify(currentOrders));
  const orderIds = [] as any;
  let giftCardActivationInfo = [] as any;

  if(isDetailsPage) {
    orderIds.push(orders[0].orderId);
  } else {
    orders.map((order: any) => {
      order.items.map((currentItem: any) => {
          if(currentItem.productTypeId === 'GIFT_CARD' && !orderIds.includes(currentItem.orderId)) {
            orderIds.push(order.orderId);
          }        
      })
    })
  }
  if(!orderIds.length) return orders;

  try {
    const resp = await UtilService.fetchGiftCardFulfillmentInfo({
          orderId: orderIds,
          orderId_op: "in",
          pageSize: 250 // The default pageSize < 10 and can cause issues with large gitCardFulfillment records, Hence setting to 250
      })

    if(!hasError(resp)) {
      giftCardActivationInfo = resp.data
    } else {
      throw resp.data
    }
  } catch(error) {
    logger.error(error)
  }

  if(giftCardActivationInfo.length) {
    if(isDetailsPage) {
      orders[0].shipGroup.items = orders[0].shipGroup.items.map((item: any) => {
        return updateGiftCardActivationDetails(item, giftCardActivationInfo);
      })
    } else {
      orders = orders.map((order: any) => {
        order.items = order.items.map((item: any) => {
            return updateGiftCardActivationDetails(item, giftCardActivationInfo, order.orderId);
          })
          return order
      })
    }
  }

  return isDetailsPage ? orders[0] : orders
}

export const OrderService = {
  cancelOrder,
  createPicklist,
  fetchGiftCardActivationDetails,
  fetchOrderDetails,
  fetchOrderItems,
  fetchOrderPaymentPreferences,
  fetchPicklists,
  fetchTrackingCodes,
  findCompletedShipments,
  findOrderShipGroup,
  findPackedShipments,
  getCompletedOrders,
  getOpenOrders,
  getOrderDetails,
  getOrderItemRejectionHistory,
  getPackedOrders,
  getShipmentItems,
  getShipToStoreOrders,
  packOrder,
  performFind,
  printPackingSlip,
  printPicklist,
  printShippingLabelAndPackingSlip,
  quickShipEntireShipGroup,
  rejectOrderItems,
  sendPickupScheduledNotification,
  shipOrder,
  updateShipment
}