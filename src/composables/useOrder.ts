import { api, client, commonUtil, logger, translate } from '@common';
import { cogOutline } from 'ionicons/icons';

export const useOrder = () => {

  const fetchOrderAttributes = async (orderId: string): Promise<any> => {
    return api({
      url: `oms/orders/${orderId}/attributes`,
      method: "GET",
    });
  }

  const rejectOrderItems = async (payload: any): Promise<any> => {
    return api({
      url: "poorti/rejectOrderItems",
      method: "post",
      data: payload
    });
  }

  const createPicklist = async (payload: any): Promise<any> => {
    return api({
      url: `/poorti/createOrderFulfillmentWave`,
      method: "POST",
      data: payload
    });
  }

  const printPicklist = async (picklistId: string): Promise<any> => {
    try {
      const resp = await api({
        url: "/fop/apps/pdf/PrintPicklist",
        method: "GET",
        baseURL: commonUtil.getMaargBaseURL(),
        responseType: "blob",
        params: { picklistId }
      });

      if (!resp || commonUtil.hasError(resp)) {
        throw resp?.data;
      }

      // Generate local file URL for the blob received
      const pdfUrl = window.URL.createObjectURL(resp.data);
      // Open the file in new tab
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'picklist' }), { icon: cogOutline });
      }
    } catch (err) {
      commonUtil.showToast(translate('Failed to print picklist'))
      logger.error("Failed to print picklist", err)
    }
  }

  const printPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {
    try {
      const resp = await api({
        url: "fop/apps/pdf/PrintPackingSlip",
        baseURL: commonUtil.getMaargBaseURL(),
        method: "GET",
        params: {
          shipmentId: shipmentIds
        },
        responseType: "blob"
      });


      if (!resp || commonUtil.hasError(resp)) {
        throw resp?.data
      }

      // Generate local file URL for the blob received
      const pdfUrl = window.URL.createObjectURL(resp.data);
      // Open the file in new tab
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'packing slip' }), { icon: cogOutline });
      }

    } catch (err) {
      commonUtil.showToast(translate('Failed to print packing slip'))
      logger.error("Failed to load packing slip", err)
    }
  }

  const sendPickupScheduledNotification = async (payload: any): Promise<any> => {
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

  const sendHandoverNotification = async (payload: any): Promise<any> => {
    return api({
      url: "oms/orders/pickupScheduledNotification",
      method: "post",
      data: {
        emailType: "HANDOVER_STS_ORDER",
        ...payload
      }
    });
  }

  const handoverShipToStoreOrder = async (shipmentId: string): Promise<any> => {
    return api({
      url: `/poorti/shipments/${shipmentId}`,
      method: 'PUT',
      data: {
        statusId: 'SHIPMENT_DELIVERED',
      }
    });
  }

  const arrivedShipToStore = async (shipmentId: string): Promise<any> => {
    return api({
      url: `/poorti/shipments/${shipmentId}`,
      method: 'PUT',
      data: {
        statusId: 'SHIPMENT_ARRIVED',
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

  const printShippingLabelAndPackingSlip = async (shipmentIds: Array<string>): Promise<any> => {

    try {
      // Get packing slip from the server
      const resp: any = await api({
        method: 'get',
        url: 'LabelAndPackingSlip.pdf',
        baseURL: commonUtil.getOmsURL(),
        params: {
          shipmentIds
        },
        responseType: "blob"
      })

      if (!resp || resp.status !== 200 || commonUtil.hasError(resp)) {
        throw resp.data;
      }

      // Generate local file URL for the blob received
      const pdfUrl = window.URL.createObjectURL(resp.data);
      // Open the file in new tab
      try {
        (window as any).open(pdfUrl, "_blank").focus();
      }
      catch {
        commonUtil.showToast(translate('Unable to open as browser is blocking pop-ups.', { documentName: 'shipping label and packing slip' }));
      }

    } catch (err) {
      commonUtil.showToast(translate('Failed to print shipping label and packing slip'))
      logger.error("Failed to load shipping label and packing slip", err)
    }
  }

  const cancelOrder = async (payload: any): Promise<any> => {
    return api({
      url: `oms/orders/${payload.orderId}/items/cancel`,
      method: "post",
      data: payload
    });
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

  const getAvailablePickers = async (query: any): Promise<any> => {
    return api({
      url: "solr-query",
      method: "post",
      baseURL: commonUtil.getOmsURL(),
      data: query
    });
  };

  const resetPicker = async (payload: any): Promise<any> => {
    return api({
      url: "/service/resetPicker",
      method: "post",
      data: payload
    })
  }

  const fetchJobInformation = async (payload: any): Promise<any> => {
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
      baseURL: commonUtil.getOmsURL(),
      data: payload
    });
  }

  const activateGiftCard = async (payload: any): Promise<any> => {
    return api({
      url: "poorti/giftCardFulfillments",
      method: "post",
      data: payload
    });
  }

  const getRerouteFulfillmentConfig = async (payload: any): Promise<any> => {
    return api({
      url: "performFind",
      method: "get",
      baseURL: commonUtil.getOmsURL(),
      params: payload,
    });
  }


  const ensurePartyRole = async (payload: any): Promise<any> => {
    return api({
      url: "service/ensurePartyRole",
      method: "post",
      data: payload
    });
  }

  const generateAccessToken = async (config: any): Promise<any> => {
    return client({
      url: "/generateShopifyAccessToken",
      method: "post",
      ...config
    });
  }

  return {
    activateGiftCard,
    arrivedShipToStore,
    cancelOrder,
    convertToShipToStore,
    createPicklist,
    ensurePartyRole,
    fetchJobInformation,
    fetchOrderAttributes,
    generateAccessToken,
    getAvailablePickers,
    getBillingDetails,
    getProcessRefundStatus,
    getRerouteFulfillmentConfig,
    getShipToStoreOrders,
    handoverShipToStoreOrder,
    printPackingSlip,
    printPicklist,
    printShippingLabelAndPackingSlip,
    rejectOrderItems,
    resetPicker,
    sendHandoverNotification,
    sendPickupNotification,
    sendPickupScheduledNotification,
  }
}

