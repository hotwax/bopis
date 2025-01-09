import { api, client, hasError } from '@/adapter';
import emitter from '@/event-bus';
import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import { formatPhoneNumber, showToast } from '@/utils';
import logger from '@/logger';
import { cogOutline } from 'ionicons/icons';

const getOpenOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const fetchOrderItems = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getOrderDetails = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getCustomerContactDetails = async (orderId: any): Promise <any>  => {
  return api({
    url: `orders/${orderId}`,
    method: "get",
    cache: true
  });
}

const getPackedOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const getCompletedOrders = async (payload: any): Promise <any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: payload
  });
}

const updateShipment = async (payload: any): Promise <any> => {
  return api({
    url: "updateShipment",
    method: "post",
    data: payload
  });
}

const quickShipEntireShipGroup = async (payload: any): Promise <any> => {
  return api({
    url: "quickShipEntireShipGroup",
    method: "post",
    data: payload
  });
}

const rejectItem = async (payload: any): Promise<any> => {
  emitter.emit("presentLoader");
  let resp = '' as any;
  try {
    const params = {
      'orderId': payload.orderId,
      'rejectReason': payload.item.reason,
      'facilityId': payload.item.facilityId,
      'orderItemSeqId': payload.item.orderItemSeqId,
      'shipmentMethodTypeId': payload.shipmentMethodEnumId,
      'quantity': parseInt(payload.item.quantity),
      ...(payload.shipmentMethodEnumId === "STOREPICKUP" && ({ "naFacilityId": "PICKUP_REJECTED" })),
    }

    resp = await api({
      url: "rejectOrderItem",
      method: "post",
      data: { 'payload': params }
    });

    if (!hasError(resp)) {
      showToast(translate('Item has been rejected successfully.'));
    } else {
      showToast(translate('Something went wrong'));
    }
  } catch (error) {
    logger.error(error);
  }
  emitter.emit("dismissLoader");
  return resp;
}

const rejectOrderItem = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

const createPicklist = async (query: any): Promise <any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  return api({
    url: 'createPicklist',
    method: 'POST',
    data: query,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

const printPicklist = async (picklistId: string): Promise<any> => {
  try {
    // Get picklist from the server
    const resp: any = await api({
      method: 'get',
      url: 'PrintPicklist.pdf',
      params: {
        picklistId
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
      showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'picklist'}), { icon: cogOutline });
    }
  } catch (err) {
    showToast(translate('Failed to print picklist'))
    logger.error("Failed to print picklist", err)
  }
}

const sendPickupScheduledNotification = async (payload: any): Promise <any> => {
  return api({
    url: "service/sendPickupScheduledNotification",
    method: "post",
    data: payload
  });
}

const getShipToStoreOrders = async (query: any): Promise<any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: query
  })
}

const getShipmentItems = async (shipmentIds: any): Promise<any> => {
  if (!shipmentIds.length) return []
  const requests = []

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

  const shipmentItemsResps = await Promise.all(requests.map((params) => api({
    url: 'performFind',
    method: 'POST',
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
  return api({
    url: 'performFind',
    method: 'POST',
    data: payload
  })
}

const fetchOrderPaymentPreferences = async (params: any): Promise<any> => {
  return await api({
    url: "performFind",
    method: "get",
    params
  });
}

const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
  try {
    // Get packing slip from the server
    const resp: any = await api({
      method: 'get',
      url: 'LabelAndPackingSlip.pdf',
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

const getShippingPhoneNumber = async (orderId: string): Promise<any> => {
  let phoneNumber = '' as any
  try {
    let resp: any = await api({
      url: "performFind",
      method: "get",
      params: {
        "entityName": "OrderContactMech",
        "inputFields": {
          orderId,
          "contactMechPurposeTypeId": "PHONE_SHIPPING"
        },
        "fieldList": ["orderId", "contactMechPurposeTypeId", "contactMechId"],
        "viewSize": 1
      }
    })

    if (!hasError(resp)) {
      const contactMechId = resp.data.docs[0].contactMechId
      resp = await api({
        url: "performFind",
        method: "get",
        params: {
          "entityName": "TelecomNumber",
          "inputFields": {
            contactMechId,
          },
          "fieldList": ["contactNumber", "countryCode", "areaCode", "contactMechId"],
          "viewSize": 1
        }
      })

      if (!hasError(resp)) {
        const { contactNumber, countryCode, areaCode } =  resp.data.docs[0]
        phoneNumber = formatPhoneNumber(countryCode, areaCode, contactNumber)
      } else {
        throw resp.data
      }
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error('Failed to fetch customer phone number', err)
  }
  return phoneNumber
}

const findOrderShipGroup = async (query: any): Promise<any> => {
  return api({
    url: "solr-query",
    method: "post",
    data: query
  });
}

const fetchTrackingCodes = async (shipmentIds: Array<string>): Promise<any> => {
  let shipmentTrackingCodes = [];
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
    const resp = await api({
      url: "performFind",
      method: "get",
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
  return api({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    data: payload
  })
}

const performFind = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const cancelItem = async (payload: any): Promise<any> => {
  return api({
    url: "cancelOrderItem",
    method: "post",
    data: payload
  });
}

export const OrderService = {
  cancelItem,
  fetchOrderItems,
  fetchOrderPaymentPreferences,
  fetchTrackingCodes,
  findOrderShipGroup,
  getOpenOrders,
  getOrderDetails,
  getCompletedOrders,
  getPackedOrders,
  getOrderItemRejectionHistory,
  quickShipEntireShipGroup,
  rejectItem,
  rejectOrderItem,
  updateShipment,
  createPicklist,
  sendPickupScheduledNotification,
  getShipToStoreOrders,
  getShipmentItems,
  getCustomerContactDetails,
  getShippingPhoneNumber,
  packOrder,
  performFind,
  printPicklist,
  printShippingLabelAndPackingSlip
}