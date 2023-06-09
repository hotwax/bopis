import { api, client } from '@/adapter';
import { translate } from '@/i18n';
import store from '@/store';
import { hasError, showToast } from '@/utils';

const getOpenOrders = async (payload: any): Promise <any> => {
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

const rejectOrderItem = async (payload: any): Promise <any> => {
  return api({
    url: "rejectOrderItem",
    method: "post",
    data: payload
  });
}

const createPicklist = async (query: any): Promise <any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: 'createPicklist',
    method: 'POST',
    data: query,
    baseURL,
    headers: { "Content-Type": "multipart/form-data" },
  })
}

const sendReadyToPickupItemNotification = async (payload: any): Promise <any> => {
  return api({
    url: "service/sendReadyToPickupItemNotification",
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

const getShipmentItems = async (shipments: any): Promise<any> => {
  if (!Object.keys(shipments).length) return []
  const requests = []
  let orders = []

  try {
    const shipmentList = Object.values(shipments)
    while (shipmentList.length) {
      const batch = shipmentList.splice(0, 20)
      const params = {
        inputFields: {
          shipmentId: batch.map((shipmentItem: any) => shipmentItem.shipmentId)
        },
        viewSize: 200, // batch of 20 shipments * 10 shipment items in each to fetch
        entityName: 'ShipmentItem',
        noConditionFind: "Y",
        fieldList: ['shipmentId', 'productId', 'shipmentItemSeqId']
      }
      requests.push(params)
    }

    let orderShipmentItemsResps = await Promise.all(requests.map((params) => api({
      url: 'performFind',
      method: 'POST',
      data: params
    })))

    orderShipmentItemsResps = orderShipmentItemsResps.reduce((responseData: any, response: any) => {
      if (!hasError(response)) responseData.push(...response.data.docs)
      return responseData
    }, [])

    if (!orderShipmentItemsResps.length) return []
    orders = orderShipmentItemsResps.reduce((shipmentsWithItems: any, shipmentItem: any) => {
      if (!shipmentsWithItems[shipmentItem.shipmentId]) {
        shipmentsWithItems[shipmentItem.shipmentId] = { ...shipments[shipmentItem.shipmentId], items: [shipmentItem] }
      } else {
        shipmentsWithItems[shipmentItem.shipmentId].items.push(shipmentItem)
      }
      return shipmentsWithItems
    }, {})

    orders = Object.values(orders)
    let productIds: any = new Set();

    orders.map((shipment: any) => {
      shipment.items.map((item: any) => productIds.add(item.productId))
      return productIds
    });

    productIds = [...productIds]
    store.dispatch('product/fetchProducts', { productIds })
  } catch (err) {
    console.error(err)
    showToast(translate("Something went wrong"))
  }

  return orders
}

export const OrderService = {
  getOpenOrders,
  getOrderDetails,
  getCompletedOrders,
  getPackedOrders,
  quickShipEntireShipGroup,
  rejectOrderItem,
  updateShipment,
  createPicklist,
  sendReadyToPickupItemNotification,
  getShipToStoreOrders,
  getShipmentItems
}