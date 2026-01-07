import { api, apiClient, hasError } from '@/adapter';
import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import { getCurrentFacilityId, showToast } from '@/utils';
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

const fetchOrderAttributes = async (orderId: string): Promise<any> => {
  return api({
    url: `oms/orders/${orderId}/attributes`,
    method: "GET",
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

const fetchPicklists = async (payload: any): Promise <any>  => {
  return api({
    url: `poorti/shipmentPicklists`,
    method: "GET",
    params: payload
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

const handoverShipToStoreOrder = async (shipmentId: string): Promise<any> => {
  return api({
    url: `/poorti/shipments/${shipmentId}`,
    method: 'PUT',
    data: {
      statusId : 'SHIPMENT_DELIVERED', 
    }
  });
}

const convertToShipToStore = async (payload: any): Promise<any> => {
  return api({
    url: `/oms/orders/${payload.orderId}/shipToStore`,
    method: 'POST',
    data: {
      shipGroupSeqId: payload.shipGroupSeqId,
    }
  });
}

const getShipToStoreOrders = async (params: any): Promise<any> => {

  return api({
    url: 'oms/orders/shipToStore',
    method: 'GET',
    params
  })
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
const getBillingDetails = async (payload: any): Promise<any> => {
  return api({
    url: `/poorti/orders/${payload.orderId}/billing`,
    method: "GET"
  });
}

const sendPickupNotification = async (payload: any): Promise<any> => {  
  return await api({
    url: `oms/orders/pickupScheduledNotification`,
    method: "POST",
    data: payload,
  });
};

const getCommunicationEvents = async (payload: any): Promise<any> => {
  return api({
    url: "/oms/communicationEvents",
    method: "GET",
    params: payload
  });
};


export const OrderService = {
  cancelOrder,
  createPicklist,
  fetchGiftCardActivationDetails,
  fetchOrderDetails,
  fetchOrderAttributes,
  fetchOrderItems,
  fetchPicklists,
  findCompletedShipments,
  findPackedShipments,
  getOpenOrders,
  getOrderItemRejectionHistory,
  getShipToStoreOrders,
  packOrder,
  performFind,
  printPackingSlip,
  printPicklist,
  printShippingLabelAndPackingSlip,
  rejectOrderItems,
  sendPickupScheduledNotification,
  handoverShipToStoreOrder,
  convertToShipToStore,
  shipOrder,
  getBillingDetails,
  sendPickupNotification,
  getCommunicationEvents
}