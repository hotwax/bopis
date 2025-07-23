import { apiClient, hasError } from '@/adapter';
import emitter from '@/event-bus';
import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import { formatPhoneNumber, showToast } from '@/utils';
import logger from '@/logger';
import { cogOutline } from 'ionicons/icons';
import { UtilService } from "@/services/UtilService";

const getOpenOrders = async (payload: any): Promise <any> => {
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

const getCustomerContactDetails = async (orderId: any): Promise <any>  => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: `orders/${orderId}`,
    method: "get",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    cache: true
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

const rejectItem = async (payload: any): Promise<any> => {
  emitter.emit("presentLoader");
  let resp = '' as any;
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

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

    resp = await apiClient({
      url: "rejectOrderItem",
      method: "post",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
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
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "rejectOrderItem",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  });
}

const createPicklist = async (query: any): Promise <any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "createPicklist",
    method: "post",
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "multipart/form-data"
    },
    baseURL,
    data: query
  });
}

const printPicklist = async (picklistId: string): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  try {
    // Get picklist from the server
    const resp: any = await apiClient({
      method: 'get',
      url: 'PrintPicklist.pdf',
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
      },
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
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "service/sendPickupScheduledNotification",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
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

const getShippingPhoneNumber = async (orderId: string): Promise<any> => {
  let phoneNumber = '' as any
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  try {
    let resp: any = await apiClient({
      url: "performFind",
      method: "get",
      baseURL,
      headers: {
        "Authorization": "Bearer " + omstoken,
        "Content-Type": "application/json"
      },
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
      resp = await apiClient({
        url: "performFind",
        method: "get",
        baseURL,
        headers: {
         "Authorization": "Bearer " + omstoken,
          "Content-Type": "application/json"
        },
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
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];

  return apiClient({
    url: "/service/packStoreFulfillmentOrder",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
    data: payload
  })
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

const cancelItem = async (payload: any): Promise<any> => {
  const baseURL = store.getters['user/getOmsBaseUrl'];
  const omstoken = store.getters['user/getUserToken'];
  return apiClient({
    url: "cancelOrderItem",
    method: "post",
    baseURL,
    headers: {
      "Authorization": "Bearer " + omstoken,
      "Content-Type": "application/json"
    },
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
      order.parts.map((part: any) => {
        part.items.map((currentItem: any) => {
          if(currentItem.productTypeId === 'GIFT_CARD' && !orderIds.includes(currentItem.orderId)) {
            orderIds.push(order.orderId);
          }
        })
      })
    })
  }
  if(!orderIds.length) return orders;

  try {
    const resp = await UtilService.fetchGiftCardFulfillmentInfo({
      entityName: "GiftCardFulfillment",
      inputFields: {
        orderId: orderIds,
        orderId_op: "in"
      },
      fieldList: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"],
      viewSize: 250
    })

    if(!hasError(resp)) {
      giftCardActivationInfo = resp.data.docs
    } else {
      throw resp.data
    }
  } catch(error) {
    logger.error(error)
  }

  if(giftCardActivationInfo.length) {
    if(isDetailsPage) {
      orders[0].part.items = orders[0].part.items.map((item: any) => {
        return updateGiftCardActivationDetails(item, giftCardActivationInfo);
      })
    } else {
      orders = orders.map((order: any) => {
        order.parts = order.parts.map((part: any) => {
          part.items = part.items.map((item: any) => {
            return updateGiftCardActivationDetails(item, giftCardActivationInfo, order.orderId);
          })
          return part
        })
        return order
      })
    }
  }

  return isDetailsPage ? orders[0] : orders
}

export const OrderService = {
  cancelItem,
  fetchGiftCardActivationDetails,
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