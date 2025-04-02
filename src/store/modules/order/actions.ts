import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { showToast, getCurrentFacilityId } from "@/utils";
import { hasError } from '@/adapter'
import { translate } from "@hotwax/dxp-components";
import emitter from '@/event-bus'
import store from "@/store";
import { prepareOrderQuery } from "@/utils/solrHelper";
import { getOrderCategory, removeKitComponents } from '@/utils/order'
import { UtilService } from "@/services/UtilService";
import logger from "@/logger";


const actions: ActionTree<OrderState , RootState> ={

  async getOrderDetails({ dispatch, commit }, payload ) {

    let resp;
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER',
      '-fulfillmentStatus': '(Cancelled OR Rejected OR Completed)',
    })

    try {
      resp = await OrderService.fetchOrderItems(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        const orderIds = resp.data.grouped?.orderId?.groups.map((order: any) => order.doclist.docs[0].orderId);
        dispatch('fetchOrderItems', {...payload, orderIds});
      } else {  
        commit(types.ORDER_INFO_UPDATED, { orders: {} })
      }
    } catch(err) {
      logger.error(err)
      commit(types.ORDER_INFO_UPDATED, { orders: {} })
    }
    return resp;
  },

  async fetchOrderItems({ commit }, payload) {
  
    let resp;
    const { productId, orderIds, ...params } = payload;
    const orderQueryPayload = prepareOrderQuery({
      ...params,
      orderIds,
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER',
    })

    try {
      resp = await OrderService.fetchOrderItems(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        const productIds: any = []
        const orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          let currentItem: any = {};
          let currentItemQty = 0;
          const otherItemsObj: any = {};
          order.doclist.docs.map((item: any) => {
            if (item.productId == productId) {
              currentItemQty += item.itemQuantity; 
              if(!currentItem.productId) {
                currentItem = item;
              }
            } else {
              if (!otherItemsObj[item.productId]) {
                otherItemsObj[item.productId] = { ...item, quantity: 0 };
                productIds.push(item.productId);
              }
              otherItemsObj[item.productId].quantity += item.itemQuantity;
            }
          });

          currentItem = { ...currentItem, quantity: currentItemQty };
          const otherItems = Object.values(otherItemsObj);
          
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName
            },
            shipmentMethod: {
              shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
              shipmentMethodTypeId: orderItem.shipmentMethodTypeId
            },
            otherItems: otherItems,
            currentItem: currentItem
          }
        })
        productIds.push(productId)
        
        this.dispatch('product/fetchProducts', { productIds: productIds });
        commit(types.ORDER_INFO_UPDATED, { orders })
      } else {
        commit(types.ORDER_INFO_UPDATED, { orders: {} })
      }
    }
    catch(err) {
      logger.error(err)
      commit(types.ORDER_INFO_UPDATED, { orders: {} })
    }
    return resp;
  },

  async getOpenOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS'] ? 'STOREPICKUP' : '',
      '-shipmentStatusId': '(SHIPMENT_PACKED OR SHIPMENT_SHIPPED)',
      '-fulfillmentStatus': '(Cancelled OR Rejected)',
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER'
    })

    try {
      resp = await OrderService.getOpenOrders(orderQueryPayload)
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {

        const productIds = [] as any;
        resp.data.grouped?.orderId?.groups.forEach((order: any) => {
          productIds.push(...order.doclist.docs.map((item: any) => item.productId));
        });
        await this.dispatch('product/fetchProducts', { productIds });

        let orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName
            },
            statusId: orderItem.orderStatusId,
            parts: removeKitComponents(order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
              if (!currentOrderPart) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    shipGroupSeqId: item.shipGroupSeqId,
                    orderId: orderItem.orderId,
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId,
                    facilityId: item.facilityId,
                    quantity: item.itemQuantity,
                    inventoryItemId: item.inventoryItemId,
                    showKitComponents: false
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  shipGroupSeqId: item.shipGroupSeqId,
                  orderId: orderItem.orderId,
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId,
                  quantity: item.itemQuantity,
                  inventoryItemId: item.inventoryItemId,
                  showKitComponents: false
                })
              }

              return arr
            }, [])),
            placedDate: orderItem.orderDate,
            shippingInstructions: orderItem.shippingInstructions,
            shipGroupSeqId: orderItem.shipGroupSeqId,
            isPicked: orderItem.isPicked,
            pickers: orderItem.pickers ? (orderItem.pickers.reduce((names: any, picker: string) => {
              names.push(picker.split('/')[1]);
              return names;
            }, [])).join(', ') : "",
            pickerIds: orderItem.pickers ? (orderItem.pickers.reduce((ids: any, picker: string) => {
              ids.push(picker.split('/')[0]);
              return ids;
            }, [])) : "",
            picklistId: orderItem.picklistId,
            picklistBinId: orderItem.picklistBinId
          }
        })

        const total = resp.data.grouped?.orderId?.ngroups;

        if(payload.viewIndex && payload.viewIndex > 0) orders = state.open.list.concat(orders)
        commit(types.ORDER_OPEN_UPDATED, { orders, total })
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async fetchAdditionalOrderInformation({ dispatch }, orderDetails) {
    let order = orderDetails;
    const orderId = order.orderId

    try {
      const apiPayload = [{
        inputFields: {
          orderId
        },
        viewSize: 50,
        filterByDate: "Y",
        entityName: "OrderHeaderAndRoles"
      }, {
        inputFields: {
          orderId,
          contactMechPurposeTypeId: ["BILLING_LOCATION", "BILLING_EMAIL", "PHONE_BILLING"],
          contactMechPurposeTypeId_op: "in"
        },
        viewSize: 50,
        fieldList: ["contactMechPurposeTypeId", "contactMechId"],
        entityName: "OrderContactMech"
      }, {
        inputFields: {
          orderId
        },
        viewSize: 50,
        filterByDate: "Y",
        fieldList: ["orderIdentificationTypeId", "orderId", "idValue"],
        entityName: "OrderIdentification"
      }, {
        inputFields: {
          orderId,
          attrName: ["customerId", "municipio"],
          attrName_op: "in",
          attrName_ic: "Y"
        },
        viewSize: 50,
        fieldList: ["attrName", "attrValue"],
        entityName: "OrderAttribute"
      }, {
        inputFields: {
          orderId,
          statusId: ["ORDER_COMPLETED", "ORDER_APPROVED"],
          statusId_op: "in"
        },
        viewSize: 2,
        entityName: "OrderStatus"
      }, {
        inputFields: {
          orderId,
          statusId: "PAYMENT_CANCELLED",
          statusId_op: "notEqual"
        },
        orderBy: "createdDate DESC",
        viewSize: 50,
        fieldList: ["paymentMethodTypeId", "maxAmount", "statusId"],
        entityName: "OrderPaymentPreference"
      }, {
        inputFields: {
          orderId
        },
        viewSize: 50,
        entityName: "OrderItemShipGroupAndFacility"
      }]

      const [orderHeader, orderContactMech, orderIdentifications, orderAttributes, orderStatusInfo, orderPaymentPreference] = await Promise.allSettled(apiPayload.map((payload: any) => OrderService.performFind(payload)))

      if(orderHeader.status === "fulfilled" && !hasError(orderHeader.value) && orderHeader.value.data.count > 0) {
        order = {
          ...order,
          ...orderHeader.value.data.docs[0]
        }

        if(!order.orderId) {
          throw "Failed to fetch order information"
        }
      }
      if(orderContactMech.status === "fulfilled" && !hasError(orderContactMech.value) && orderContactMech.value.data.count > 0) {
        const orderContactMechTypes: any = orderContactMech.value.data.docs.reduce((contactMechTypes: any, contactMech: any) => {
          contactMechTypes[contactMech.contactMechPurposeTypeId] = contactMech.contactMechId

          return contactMechTypes;
        }, {})

        const postalAddress = await OrderService.performFind({
          inputFields: {
            contactMechId: Object.keys(orderContactMechTypes).filter((mechType: string) => mechType === "BILLING_LOCATION").map((mechType: string) => orderContactMechTypes[mechType]),
            contactMechId_op: "in"
          },
          viewSize: 20,
          entityName: "PostalAddressAndGeo"
        })

        if(!hasError(postalAddress) && postalAddress.data.count > 0) {
          postalAddress.data.docs.map((address: any) => {
            if(address.contactMechId === orderContactMechTypes["BILLING_LOCATION"]) {
              order["billingAddress"] = address
            }
          })
        }

        const customerInfo = await OrderService.performFind({
          inputFields: {
            contactMechId: Object.keys(orderContactMechTypes).filter((mechType: string) => mechType === "BILLING_EMAIL" || mechType === "PHONE_BILLING").map((mechType: string) => orderContactMechTypes[mechType]),
            contactMechId_op: "in"
          },
          viewSize: 20,
          fieldList: ["infoString", "contactMechId", "tnContactNumber"],
          entityName: "ContactMechDetail"
        })

        if(!hasError(customerInfo) && customerInfo.data.count > 0) {
          customerInfo.data.docs.map((info: any) => {
            if(info.contactMechId === orderContactMechTypes["BILLING_EMAIL"]) {
              order["billingEmail"] = info.infoString
            }

            if(info.contactMechId === orderContactMechTypes["PHONE_BILLING"]) {
              order["billingPhone"] = info.tnContactNumber
            }
          })
        }
      }

      // Fetching order identifications
      if(orderIdentifications.status === "fulfilled" && !hasError(orderIdentifications.value) && orderIdentifications.value.data.count > 0) {
        order["shopifyOrderId"] = orderIdentifications.value.data.docs.find((identification: any) => identification.orderIdentificationTypeId === "SHOPIFY_ORD_ID")?.idValue
      }

      // Fetching order attributes
      order["orderAttributes"] = {}
      if(orderAttributes.status === "fulfilled" && !hasError(orderAttributes.value) && orderAttributes.value.data.count > 0) {
        orderAttributes.value.data.docs.map((attribute: any) => {
          // For some attbiutes we get casing difference, like customerId, CustomerId, so adding ic in performFind, but to display it correctly on UI, converting it into lowerCase
          order["orderAttributes"][attribute.attrName.toLowerCase()] = attribute.attrValue
        })
      }

      // Fetching brokering information for order
      if(orderStatusInfo.status === "fulfilled" && !hasError(orderStatusInfo.value) && orderStatusInfo.value.data.count > 0) {
        order["approvedDate"] = orderStatusInfo.value.data.docs.find((info: any) => info.statusId === "ORDER_APPROVED")?.statusDatetime
        order["completedDate"] = orderStatusInfo.value.data.docs.find((info: any) => info.statusId === "ORDER_COMPLETED")?.statusDatetime
      }

      // Fetching payment preference for order
      if(orderPaymentPreference.status === "fulfilled" && !hasError(orderPaymentPreference.value) && orderPaymentPreference.value.data.count > 0) {
        const paymentMethodTypeIds: Array<string> = [];
        const statusIds: Array<string> = [];
        order["orderPayments"] = orderPaymentPreference.value.data.docs.map((paymentPreference: any) => {
          paymentMethodTypeIds.push(paymentPreference.paymentMethodTypeId)
          statusIds.push(paymentPreference.statusId)
          return {
            amount: paymentPreference["maxAmount"],
            methodTypeId: paymentPreference["paymentMethodTypeId"],
            paymentStatus: paymentPreference["statusId"]
          }
        })

        this.dispatch("util/fetchStatusDesc", statusIds)

        if(paymentMethodTypeIds.length) {
          this.dispatch("util/fetchPaymentMethodTypeDesc", paymentMethodTypeIds)
        }
      }

      if(order.picklistId) {
        const picklistInfo = await OrderService.performFind({
          inputFields: {
            picklistId: order.picklistId,
          },
          viewSize: 1,
          entityName: "Picklist",
          fieldList: ["picklistId", "picklistDate"]
        })

        if(!hasError(picklistInfo) && picklistInfo.data.count > 0) {
          order["picklistDate"] = picklistInfo.data.docs[0].picklistDate
        }
      }
    } catch(err) {
      logger.error(err)
    }

    if(orderDetails.orderType !== "open") {
      order = await OrderService.fetchGiftCardActivationDetails({ isDetailsPage: true, currentOrders: [order] });
    }

    await dispatch('updateCurrent', { order })
  },

  async getOrderDetail({ dispatch }, { payload, orderType }) {
    if(orderType === 'open') {
      payload['orderStatusId'] = "ORDER_APPROVED"
      payload['-shipmentStatusId'] = "(SHIPMENT_PACKED OR SHIPMENT_SHIPPED)"
      payload['-fulfillmentStatus'] = '(Cancelled OR Rejected)'
    } else if(orderType === 'packed') {
      payload['shipmentStatusId'] = "SHIPMENT_PACKED"
      payload['-fulfillmentStatus'] = '(Cancelled OR Rejected)'
    } else if(orderType === 'completed') {
      payload['orderItemStatusId'] = "ITEM_COMPLETED"
      payload['docType'] = "ORDER"
    } else {
      dispatch('updateCurrent', { order: {} })
      return;
    }

    // const current = state.current as any
    // const orders = JSON.parse(JSON.stringify(state.open.list)) as any
    // // As one order can have multiple parts thus checking orderId and partSeq as well before making any api call
    // if(current.orderId === payload.orderId && current.orderType === orderType && current.part?.orderPartSeqId === payload.orderPartSeqId) {
    //   await this.dispatch('product/getProductInformation', { orders: [ current ] })
    //   // TODO: if we can store additional order information and just fetch shipGroup info as it was previously
    //   await dispatch("fetchAdditionalOrderInformation", current)
    //   return current
    // }
    // if(orders.length) {
    //   const order = orders.find((order: any) => {
    //     return order.orderId === payload.orderId;
    //   })
    //   if(order) {
    //     await dispatch("fetchAdditionalOrderInformation", order)
    //     return order;
    //   }
    // }

    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS'] ? 'STOREPICKUP' : '',
      orderTypeId: 'SALES_ORDER'
    })
    
    let resp;
    let currentOrder = {};
    try {
      resp = await OrderService.getOrderDetails(orderQueryPayload)
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        let orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            shipmentId: orderItem.shipmentId,
            customer: {
              partyId: orderItem.customerId || orderItem.customerPartyId,
              name: orderItem.customerName || orderItem.customerPartyName
            },
            statusId: orderItem.orderStatusId,
            parts: removeKitComponents(order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
              if (!currentOrderPart) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId,
                    facilityId: item.facilityId,
                    quantity: item.itemQuantity || item.quantity,
                    showKitComponents: false,
                    shipGroupSeqId: item.shipGroupSeqId,
                    orderId: orderItem.orderId,
                    inventoryItemId: item.inventoryItemId
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId,
                  quantity: item.itemQuantity || item.quantity,
                  showKitComponents: false,
                  shipGroupSeqId: item.shipGroupSeqId,
                  orderId: orderItem.orderId,
                  inventoryItemId: item.inventoryItemId
                })
              }

              return arr
            }, [])),
            placedDate: orderItem.orderDate,
            entryDate: orderItem.entryDate,
            shippingInstructions: orderItem.shippingInstructions,
            orderType: orderType,
            pickers: orderItem.pickers ? (orderItem.pickers.reduce((names: any, picker: string) => {
              names.push(picker.split('/')[1]);
              return names;
            }, [])).join(', ') : "",
            pickerIds: orderItem.pickers ? (orderItem.pickers.reduce((ids: any, picker: string) => {
              ids.push(picker.split('/')[0]);
              return ids;
            }, [])) : "",
            picklistId: orderItem.picklistId,
            shipGroupSeqId: orderItem.shipGroupSeqId
          }
        })

        // creating order part to render the items correctly on UI
        orders = Object.keys(orders).length ? orders.flatMap((order: any) => order.parts.map((part: any) => ({ ...order, part }))) : [];

        this.dispatch('product/getProductInformation', { orders })
        currentOrder = orders[0]
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error(err)
    }

    await dispatch("fetchAdditionalOrderInformation", currentOrder)
  },
  
  async updateCurrent ({ commit, dispatch }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order })
    await dispatch('fetchShipGroupForOrder');
  },

  // This action is added mainly to toggle the showKitComponent property for item from the order detail page
  // TODO: check whether we can use this action instead of calling updateCurrent on order info update
  // as calling update current again fetches the shipGroup info which is not required in all the cases.
  async updateCurrentOrderInfo ({ commit }, order) {
    commit(types.ORDER_CURRENT_UPDATED, { order })
  },

  async updateOrderItemFetchingStatus ({ commit, state }, payload) {
    const order = state.current ? JSON.parse(JSON.stringify(state.current)) : {};

    order.shipGroups?.find((shipGroup: any) => {
      if(shipGroup.shipGroupSeqId === payload.shipGroupSeqId){
        shipGroup.items?.find((item: any) => {
          if(item.productId === payload.productId) item.isFetchingStock = !item.isFetchingStock
        });
      }
    })

    commit(types.ORDER_CURRENT_UPDATED, { order })
  },

  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS'] ? 'STOREPICKUP' : '',
      shipmentStatusId: "SHIPMENT_PACKED",
      orderTypeId: 'SALES_ORDER',
      '-fulfillmentStatus': '(Cancelled OR Rejected)',
    })

    try {
      resp = await OrderService.getPackedOrders(orderQueryPayload)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {
        const productIds = [] as any;
        resp.data.grouped?.orderId?.groups.forEach((order: any) => {
          productIds.push(...order.doclist.docs.map((item: any) => item.productId));
        });
        await this.dispatch('product/fetchProducts', { productIds });

        let orders = resp?.data?.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            shipmentId: orderItem.shipmentId,

            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName,
            },
            statusId: orderItem.orderStatusId,
            parts: removeKitComponents(order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
              if (!currentOrderPart) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId,
                    facilityId: item.facilityId,
                    showKitComponents: false
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId,
                  showKitComponents: false
                })
              }

              return arr
            }, [])),
            placedDate: orderItem.orderDate,
            shippingInstructions: orderItem.shippingInstructions,
            pickers: orderItem.pickers ? (orderItem.pickers.reduce((names: any, picker: string) => {
              names.push(picker.split('/')[1]);
              return names;
            }, [])).join(', ') : "",
            pickerIds: orderItem.pickers ? (orderItem.pickers.reduce((ids: any, picker: string) => {
              ids.push(picker.split('/')[0]);
              return ids;
            }, [])) : "",
            picklistId: orderItem.picklistId,
            shipGroupSeqId: orderItem.shipGroupSeqId
          }
        })

        const total = resp.data.grouped?.orderId?.ngroups;

        const packedOrders = await OrderService.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })
        orders = payload.viewIndex && payload.viewIndex > 0 ? state.packed.list.concat(packedOrders) : packedOrders
        commit(types.ORDER_PACKED_UPDATED, { orders: orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async getCompletedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS'] ? 'STOREPICKUP' : '',
      orderItemStatusId: "ITEM_COMPLETED",
      orderTypeId: 'SALES_ORDER',
      docType: 'ORDER'
    })

    try {
      resp = await OrderService.getCompletedOrders(orderQueryPayload)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {
        const productIds = [] as any;
        resp.data.grouped?.orderId?.groups.forEach((order: any) => {
          productIds.push(...order.doclist.docs.map((item: any) => item.productId));
        });
        await this.dispatch('product/fetchProducts', { productIds });

        let orders = resp?.data?.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerPartyId,
              name: orderItem.customerPartyName,
            },
            statusId: orderItem.orderStatusId,
            parts: removeKitComponents(order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
              if (!currentOrderPart) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  shipmentMethodEnum: {
                    shipmentMethodEnumId: item.shipmentMethodTypeId,
                    shipmentMethodEnumDesc: item.shipmentMethodTypeDesc
                  },
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId,
                    facilityId: item.facilityId,
                    showKitComponents: false
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId,
                  showKitComponents: false
                })
              }

              return arr
            }, [])),
            placedDate: orderItem.orderDate,
            shipGroupSeqId: orderItem.shipGroupSeqId,
            pickers: orderItem.pickers ? (orderItem.pickers.reduce((names: any, picker: string) => {
              names.push(picker.split('/')[1]);
              return names;
            }, [])).join(', ') : "",
            pickerIds: orderItem.pickers ? (orderItem.pickers.reduce((ids: any, picker: string) => {
              ids.push(picker.split('/')[0]);
              return ids;
            }, [])) : "",
            picklistId: orderItem.picklistId
          }
        })

        const total = resp.data.grouped?.orderId?.ngroups;
        
        const completedOrders = await OrderService.fetchGiftCardActivationDetails({ isDetailsPage: false, currentOrders: orders })
        orders = payload.viewIndex && payload.viewIndex > 0 ? state.completed.list.concat(completedOrders) : completedOrders
        commit(types.ORDER_COMPLETED_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_COMPLETED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async deliverShipment ({ state, dispatch, commit }, order) {
    emitter.emit("presentLoader");
    const params = {
      shipmentId: order.shipmentId,
      statusId: 'SHIPMENT_SHIPPED'
    }

    let resp;

    try {
      resp = await OrderService.updateShipment(params)
      if (resp.status === 200 && !hasError(resp)) {
        // Remove order from the list if action is successful
        const orderIndex = state.packed.list.findIndex((packedOrder: any) => {
          return packedOrder.orderId === order.orderId && order.parts.some((part: any) => {
            return packedOrder.parts.some((packedOrderPart: any) => {
              return part.orderPartSeqId === packedOrderPart.orderPartSeqId;
            })
          });
        });
        if (orderIndex > -1) {
          state.packed.list.splice(orderIndex, 1);
          commit(types.ORDER_PACKED_UPDATED, { orders: state.packed.list, total: state.packed.total -1 })
        }

        if(order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP'){
          order = { ...order, handovered: true }
        } else {
          order = { ...order, shipped: true }
        }

        dispatch('updateCurrent', { order })
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  async packDeliveryItems ({ commit }, shipmentId) {
    const params = {
      shipmentId: shipmentId,
      statusId: 'SHIPMENT_PACKED'
    }
    return await OrderService.updateShipment(params)
  },

  async packShipGroupItems ({ state, dispatch, commit }, payload) {
    emitter.emit("presentLoader")

    if (store.state.user.bopisProductStoreSettings['ENABLE_TRACKING'] && payload.order.isPicked !== 'Y') {
      let resp;

      const items = payload.order.parts[0].items;
      const formData = new FormData();
      formData.append("facilityId", items[0].facilityId);
      items.map((item: any, index: number) => {
        formData.append("itemStatusId_o_"+index, "PICKITEM_PENDING")
        formData.append("pickerIds_o_"+index, payload.selectedPicker)
        formData.append("picked_o_"+index, item.quantity)
        Object.keys(item).map((property) => {
          if(property !== "facilityId") formData.append(property+'_o_'+index, item[property])
        })
      });
      
      try {
        resp = await OrderService.createPicklist(formData);
        if (resp.status !== 200 || hasError(resp) || !(resp.data.picklistId && resp.data.picklistBinId)) {
          showToast(translate('Something went wrong. Picklist can not be created.'));
          emitter.emit("dismissLoader");
          return;
        }
      } catch (err) {
        showToast(translate('Something went wrong. Picklist can not be created.'));
        emitter.emit("dismissLoader");
        return;
      }
    }

    const params = {
      orderId: payload.order.orderId,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: payload.facilityId,
      shipGroupSeqId: payload.part.orderPartSeqId
    }
    
    let resp;

    try {
      resp = await OrderService.quickShipEntireShipGroup(params)
      if (resp.status === 200 && !hasError(resp) && resp.data._EVENT_MESSAGE_) {
        /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
          Because we get the shipmentMethodTypeId on items level in wms-orders API.
          As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
        */
        const shipmentMethodTypeId = payload.part?.shipmentMethodEnum?.shipmentMethodEnumId
        if (shipmentMethodTypeId !== 'STOREPICKUP') {
          // TODO: find a better way to get the shipmentId
          const shipmentId = resp.data.shipmentId ? resp.data.shipmentId : resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
          await dispatch('packDeliveryItems', shipmentId).then((data) => {
            if (!hasError(data) && !data.data._EVENT_MESSAGE_) {
              showToast(translate("Something went wrong"))
            } else if(state.open.list.length) {
              // Remove order from the list if action is successful
              const orderIndex = state.open.list.findIndex((order: any) => {
                return order.orderId === payload.order.orderId && order.parts.some((part: any) => {
                  return part.orderPartSeqId === payload.part.orderPartSeqId;
                });
              });
              if (orderIndex > -1) {
                state.open.list.splice(orderIndex, 1);
                commit(types.ORDER_OPEN_UPDATED, { orders: state.open.list, total: state.open.total -1 })
              }
            }
          })
        } else {
          dispatch("removeOpenOrder", payload)
        }

        // Adding readyToHandover or readyToShip because we need to show the user that the order has moved to the packed tab
        if(payload.order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP'){
          payload.order = { ...payload.order, readyToHandover: true }
        }else {
          payload.order = { ...payload.order, readyToShip: true }
        }
        await dispatch('updateCurrent', { order : payload.order })
        showToast(translate("Order packed and ready for delivery"))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  removeOpenOrder({ commit, state }, payload) {
    const orders = JSON.parse(JSON.stringify(state.open.list));

    const orderIndex = orders.findIndex((order: any) => {
      return order.orderId === payload.order.orderId && order.parts.some((part: any) => {
        return part.orderPartSeqId === payload.part.orderPartSeqId;
      });
    });

    if (orderIndex > -1) {
      orders.splice(orderIndex, 1);
      commit(types.ORDER_OPEN_UPDATED, { orders, total: state.open.total -1 })
    }
  },

  // TODO: handle the unfillable items count
  async setUnfillableOrderOrItem ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("rejectOrderItems", payload).then((resp) => {
      const refreshPickupOrders = resp.find((response: any) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
      if (refreshPickupOrders) {
        showToast(translate('All items were rejected from the order') + ' ' + payload.orderId);
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },

  async rejectOrderItems ({ commit }, order) {
    const payload = {
      'orderId': order.orderId
    }
    const responses = [] as any;

    // https://blog.devgenius.io/using-async-await-in-a-foreach-loop-you-cant-c174b31999bd
    // The forEach, map, reduce loops are not built to work with asynchronous callback functions.
    // It doesn't wait for the promise of an iteration to be resolved before it goes on to the next iteration.
    // We could use either the for…of the loop or the for(let i = 0;….)
    for (const item of order.part.items) {
      const params = {
        ...payload,
        'rejectReason': item.reason,
        'facilityId': item.facilityId,
        'orderItemSeqId': item.orderItemSeqId,
        'shipmentMethodTypeId': order.part.shipmentMethodEnum.shipmentMethodEnumId,
        'quantity': parseInt(item.quantity),
        ...(order.part.shipmentMethodEnum.shipmentMethodEnumId === "STOREPICKUP" && ({"naFacilityId": "PICKUP_REJECTED"})),
      }
      const resp = await OrderService.rejectOrderItem({'payload': params});
      responses.push(resp);
    }
    return responses;
  },

  async getShipToStoreIncomingOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      inputFields: {
        statusId: "SHIPMENT_SHIPPED",
        shipmentMethodTypeId: "SHIP_TO_STORE",
        orderFacilityId: getCurrentFacilityId()
      },
      viewSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
      viewIndex: payload.viewIndex ? payload.viewIndex : 0,
      entityName: 'ShipmentAndOrderHeader',
      noConditionFind: "Y",
      distinct: "Y",
      fieldList: ['shipmentId', 'firstName', 'createdDate', 'lastName', 'orderName', 'orderId']
    } as any

    if (payload.queryString.length) {
      params.inputFields = {
        firstName_value: payload.queryString,
        firstName_op: 'contains',
        firstName_ic: 'Y',
        firstName_grp: '1',
        lastName_value: payload.queryString,
        lastName_op: 'contains',
        lastName_ic: 'Y',
        lastName_grp: '2',
        orderName_value: payload.queryString,
        orderName_op: 'contains',
        orderName_ic: 'Y',
        orderName_grp: '3',
      }
    }

    let incomingOrders = [] as any
    try {
      resp = await OrderService.getShipToStoreOrders(params)
      let shipments = {} as any
      if (!hasError(resp)) {
        shipments = resp.data.docs.reduce((shipments: any, shipment: any) => {
          shipments[shipment.shipmentId] = shipment
          return shipments
        }, {})

        const shipmentItems = await OrderService.getShipmentItems(Object.keys(shipments))
          
        if (!shipmentItems?.length) {
          showToast(translate("Orders Not Found"))
          return
        }

        incomingOrders = Object.values(shipmentItems.reduce((shipmentItems: any, shipmentItem: any) => {
          if (!shipmentItems[shipmentItem.shipmentId]) {
            shipmentItems[shipmentItem.shipmentId] = { ...shipments[shipmentItem.shipmentId], items: [shipmentItem] }
          } else {
            shipmentItems[shipmentItem.shipmentId].items.push(shipmentItem)
          }
          return shipmentItems
        }, {}))

        let productIds: any = new Set();

        incomingOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })

        if (payload.viewIndex) incomingOrders = state.shipToStore.incoming.list.concat(incomingOrders)
      } else {
        showToast(translate("Orders Not Found"))
      }
    } catch (err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
      commit(types.ORDER_SHIP_TO_STORE_INCOMING_UPDATED, { orders: incomingOrders, total: resp.data?.count ? resp.data.count  : 0 })
    }
    return resp;
  },

  async getShipToStoreReadyForPickupOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      inputFields: {
        statusId: "PICKUP_SCHEDULED",
        shipmentMethodTypeId: "SHIP_TO_STORE",
        orderFacilityId: getCurrentFacilityId()
      },
      viewSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
      viewIndex: payload.viewIndex ? payload.viewIndex : 0,
      entityName: 'ShipmentAndOrderHeader',
      noConditionFind: "Y",
      distinct: "Y",
      fieldList: ['shipmentId', 'firstName', 'createdDate', 'lastName', 'orderName', 'orderId']
    } as any

    if (payload.queryString.length) {
      params.inputFields = {
        firstName_value: payload.queryString,
        firstName_op: 'contains',
        firstName_ic: 'Y',
        firstName_grp: '1',
        lastName_value: payload.queryString,
        lastName_op: 'contains',
        lastName_ic: 'Y',
        lastName_grp: '2',
        orderName_value: payload.queryString,
        orderName_op: 'contains',
        orderName_ic: 'Y',
        orderName_grp: '3',
      }
    }

    let readyForPickupOrders = []
    try {
      resp = await OrderService.getShipToStoreOrders(params)
      let shipments = {} as any
      if (!hasError(resp)) {
        shipments = resp.data.docs.reduce((shipments: any, shipment: any) => {
          shipments[shipment.shipmentId] = shipment
          return shipments
        }, {})

        const shipmentItems = await OrderService.getShipmentItems(Object.keys(shipments))

        if (!shipmentItems?.length) {
          showToast(translate("Orders Not Found"))
          return
        }

        readyForPickupOrders = Object.values(shipmentItems.reduce((shipmentItems: any, shipmentItem: any) => {
          if (!shipmentItems[shipmentItem.shipmentId]) {
            shipmentItems[shipmentItem.shipmentId] = { ...shipments[shipmentItem.shipmentId], items: [shipmentItem] }
          } else {
            shipmentItems[shipmentItem.shipmentId].items.push(shipmentItem)
          }
          return shipmentItems
        }, {}))

        let productIds: any = new Set();

        readyForPickupOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })
        if (payload.viewIndex) readyForPickupOrders = state.shipToStore.readyForPickup.list.concat(readyForPickupOrders)
      } else {
        showToast(translate("Orders Not Found"))
      }
    } catch (err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
      commit(types.ORDER_SHIP_TO_STORE_RDYFORPCKUP_UPDATED, { orders: readyForPickupOrders, total: resp.data?.count ? resp.data.count : 0 })
    }

    return resp;
  },
  
  async getShipToStoreCompletedOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      inputFields: {
        statusId: "SHIPMENT_DELIVERED",
        shipmentMethodTypeId: "SHIP_TO_STORE",
        orderFacilityId: getCurrentFacilityId()
      },
      viewSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
      viewIndex: payload.viewIndex ? payload.viewIndex : 0,
      entityName: 'ShipmentAndOrderHeader',
      noConditionFind: "Y",
      distinct: "Y",
      fieldList: ['shipmentId', 'firstName', 'createdDate', 'lastName', 'orderName', 'orderId']
    } as any

    // enbaling search on first name, last name, and orderId
    if (payload.queryString.length) {
      params.inputFields = {
        firstName_value: payload.queryString,
        firstName_op: 'contains',
        firstName_ic: 'Y',
        firstName_grp: '1',
        lastName_value: payload.queryString,
        lastName_op: 'contains',
        lastName_ic: 'Y',
        lastName_grp: '2',
        orderName_value: payload.queryString,
        orderName_op: 'contains',
        orderName_ic: 'Y',
        orderName_grp: '3',
      }
    }

    let completedOrders = []
    try {
      resp = await OrderService.getShipToStoreOrders(params)
      let shipments = {} as any
      if (!hasError(resp)) {
        shipments = resp.data.docs.reduce((shipments: any, shipment: any) => {
          shipments[shipment.shipmentId] = shipment
          return shipments
        }, {})

        const shipmentItems = await OrderService.getShipmentItems(Object.keys(shipments))

        if (!shipmentItems?.length) {
          showToast(translate("Orders Not Found"))
          return
        }

        completedOrders = Object.values(shipmentItems.reduce((shipmentItems: any, shipmentItem: any) => {
          if (!shipmentItems[shipmentItem.shipmentId]) {
            shipmentItems[shipmentItem.shipmentId] = { ...shipments[shipmentItem.shipmentId], items: [shipmentItem] }
          } else {
            shipmentItems[shipmentItem.shipmentId].items.push(shipmentItem)
          }
          return shipmentItems
        }, {}))

        let productIds: any = new Set();

        completedOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })
        if (payload.viewIndex) completedOrders = state.shipToStore.completed.list.concat(completedOrders)
      } else {
        showToast(translate("Orders Not Found"))
      }
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
      commit(types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED, { orders: completedOrders, total: resp.data?.count ? resp.data.count : 0 })
    }

    return resp;
  },

  async getOrderItemRejectionHistory({ commit }, payload) {
    emitter.emit("presentLoader");
    let rejectionHistory = [] as any;

    try {
      const params = {
        inputFields: {
          orderId: payload.orderId,
          changeReasonEnumId: payload.rejectReasonEnumIds,
          changeReasonEnumId_op: "in",
        },
        fieldList: ['changeDatetime', 'changeUserLogin', 'productId', 'changeReasonEnumId'],
        entityName: 'OrderFacilityChangeAndOrderItem',
        orderBy: 'changeDatetime DESC',
        viewSize: 20,
      }
      const resp = await OrderService.getOrderItemRejectionHistory(params);

      if (!hasError(resp) && resp.data.count > 0) {
        rejectionHistory = resp.data.docs;
        const productIds = [ ...(resp.data.docs.reduce((productIds: any, history: any) => productIds.add(history.productId), new Set())) ];

        // Get products that exist in order item rejection history
        await this.dispatch('product/fetchProducts', { productIds })
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error('Failed to fetch order item rejection history', err)
    }

    commit(types.ORDER_ITEM_REJECTION_HISTORY_UPDATED, rejectionHistory)
    emitter.emit("dismissLoader");
  },

  updateOpenOrder ({ commit }, payload) {
    commit(types.ORDER_OPEN_UPDATED, {orders: payload.orders , total: payload.total})
  },

  // clearning the orders state when logout, or user store is changed
  clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_PACKED_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_COMPLETED_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_CURRENT_UPDATED, { order: {} });
  },

  async fetchPaymentDetail({ commit, state }) {
    const order = JSON.parse(JSON.stringify(state.current));

    // if order already contains payment status don't fetch the information again
    if(order.paymentStatus) {
      return;
    }

    try {
      const params = {
        "entityName": "OrderPaymentPreference",
        "inputFields": {
          "orderId": order.orderId,
        },
        "fieldList": ["orderId", "paymentMethodTypeId", "statusId"],
        "distinct": "Y"
      }

      const resp = await OrderService.fetchOrderPaymentPreferences(params);
  
      if (!hasError(resp)) {
        const orderPaymentPreferences = resp?.data?.docs;
  
        if (orderPaymentPreferences.length > 0) {
          const paymentMethodTypeIds = orderPaymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.paymentMethodTypeId);
          if (paymentMethodTypeIds.length > 0) {
            this.dispatch('util/fetchPaymentMethodTypeDesc', paymentMethodTypeIds);
          }
  
          const statusIds = orderPaymentPreferences.map((orderPaymentPreference: any) => orderPaymentPreference.statusId);
          if (statusIds.length > 0) {
            this.dispatch('util/fetchStatusDesc', statusIds);
          }
  
          order.orderPaymentPreferences = orderPaymentPreferences;
          commit(types.ORDER_CURRENT_UPDATED, { order });
        }
      } else {
        throw resp.data
      }
    } catch (err) {
      logger.error("Error in fetching payment detail.", err);
    }
  },

  async getShippingPhoneNumber({ commit, state }) {
    let order = JSON.parse(JSON.stringify(state.current))

    try {
      const contactNumber = await OrderService.getShippingPhoneNumber(order.orderId);
      order = {
        ...order,
        contactNumber
      }
    } catch (err) {
      logger.error("Error in fetching customer phone number for current order", err);
    }
    commit(types.ORDER_CURRENT_UPDATED, { order });
  },

  async fetchShipGroupForOrder({ dispatch, state }) {
    const order = JSON.parse(JSON.stringify(state.current))

    // return if orderId is not found on order
    if (!order?.orderId) {
      return;
    }

    const params = {
      groupBy: 'shipGroupSeqId',
      'shipGroupSeqId': '[* TO *]',  // check to ignore all those records for which shipGroupSeqId is not present
      '-shipGroupSeqId': order.shipGroupSeqId,
      orderId: order.orderId,
      docType: 'ORDER'
    }

    const orderQueryPayload = prepareOrderQuery(params)

    let resp, total, shipGroups = [];
    const facilityTypeIds: Array<string> = [];

    try {
      resp = await OrderService.findOrderShipGroup(orderQueryPayload);

      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.shipGroupSeqId.matches > 0) {
        shipGroups = resp.data.grouped.shipGroupSeqId.groups
      } else {
        throw resp.data
      }
    } catch (err) {
      console.error('Failed to fetch ship group information for order', err)
    }

    // return if shipGroups are not found for order
    if (!shipGroups.length) {
      return;
    }

    shipGroups = shipGroups.map((shipGroup: any) => {
      const shipItem = shipGroup?.doclist?.docs[0]

      if (!shipItem) {
        return;
      }

      // In some case we are not having facilityTypeId in resp, resulting in undefined being pushed in the array
      // so checking for facilityTypeId before updating the array
      shipItem.facilityTypeId && facilityTypeIds.push(shipItem.facilityTypeId)

      return {
        items: shipGroup.doclist.docs,
        facilityId: shipItem.facilityId,
        facilityTypeId: shipItem.facilityTypeId,
        facilityName: shipItem.facilityName,
        shippingMethod: shipItem.shippingMethod,
        orderId: shipItem.orderId,
        shipGroupSeqId: shipItem.shipGroupSeqId
      }
    })

    this.dispatch('util/fetchFacilityTypeInformation', facilityTypeIds)

    // fetching reservation information for shipGroup from OISGIR doc
    await dispatch('fetchAdditionalShipGroupForOrder', { shipGroups });
  },

  async fetchAdditionalShipGroupForOrder({ commit, state }, payload) {
    const order = JSON.parse(JSON.stringify(state.current))
    
    
    // return if orderId is not found on order
    if (!order?.orderId) {
      return;
    }

    const shipGroupSeqIds = payload.shipGroups.map((shipGroup: any) => shipGroup.shipGroupSeqId)
    const orderId = order.orderId
    
    const params = {
      groupBy: 'shipGroupSeqId',
      'shipGroupSeqId': `(${shipGroupSeqIds.join(' OR ')})`,
      '-fulfillmentStatus': '(Rejected OR Cancelled)',
      orderId: orderId
    }
    
    const orderQueryPayload = prepareOrderQuery(params)
    
    let resp, total, shipGroups: any = [];
    
    try {
      resp = await OrderService.findOrderShipGroup(orderQueryPayload);
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.shipGroupSeqId.matches > 0) {
        total = resp.data.grouped.shipGroupSeqId.ngroups
        shipGroups = resp.data.grouped.shipGroupSeqId.groups
      } else {
        throw resp.data
      }
    } catch (err) {
      console.error('Failed to fetch ship group information for order', err)
    }

    shipGroups = payload.shipGroups.map((shipGroup: any) => {
      const reservedShipGroupForOrder = shipGroups.find((group: any) => shipGroup.shipGroupSeqId === group.doclist?.docs[0]?.shipGroupSeqId)
      const reservedShipGroup = reservedShipGroupForOrder?.groupValue ? reservedShipGroupForOrder.doclist.docs[0] : ''

      return reservedShipGroup ? {
        ...shipGroup,
        items: reservedShipGroupForOrder.doclist.docs,
        carrierPartyId: reservedShipGroup.carrierPartyId,
        shipmentId: reservedShipGroup.shipmentId,
        category: getOrderCategory({ ...reservedShipGroupForOrder.doclist.docs[0], ...shipGroup.items[0] }) // Passing shipGroup item information as we need to derive the order status and for that we need some properties those are available on ORDER doc
      } : {
        ...shipGroup,
        category: getOrderCategory(shipGroup.items[0])
      }
    })

    shipGroups.map((shipGroup: any) => {
      shipGroup.items.map((item: any) => item.isFetchingStock = false);
    })

    const carrierPartyIds: Array<string> = [];
    const shipmentIds: Array<string> = [];


    if (total) {
      shipGroups.map((shipGroup: any) => {
        if (shipGroup.shipmentId) shipmentIds.push(shipGroup.shipmentId)
        if (shipGroup.carrierPartyId) carrierPartyIds.push(shipGroup.carrierPartyId)
      })
    }

    try {
      this.dispatch('util/fetchPartyInformation', carrierPartyIds)
      const shipmentTrackingCodes = await OrderService.fetchTrackingCodes(shipmentIds)

      shipGroups.find((shipGroup: any) => {
        const trackingCode = shipmentTrackingCodes.find((shipmentTrackingCode: any) => shipGroup.shipmentId === shipmentTrackingCode.shipmentId)?.trackingCode

        shipGroup.trackingCode = trackingCode;
      })
    } catch (err) {
      console.error('Failed to fetch information for ship groups', err)
    }

    this.dispatch('product/getProductInformation', { orders: [{ parts: shipGroups }] })

    order['shipGroups'] = shipGroups

    commit(types.ORDER_CURRENT_UPDATED, {order})
    return shipGroups;
  },
  async updateCurrentItemGCActivationDetails({ commit, state }, { item, orderId, orderType, isDetailsPage }) {
    let gcInfo = {};
    let isGCActivated = false;

    try {
      const resp = await UtilService.fetchGiftCardFulfillmentInfo({
        entityName: "GiftCardFulfillment",
        inputFields: {
          orderId: orderId,
          orderItemSeqId: item.orderItemSeqId
        },
        fieldList: ["amount", "cardNumber", "fulfillmentDate", "orderId", "orderItemSeqId"]
      })

      if(!hasError(resp)) {
        isGCActivated = true;
        gcInfo = resp.data.docs[0];
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error)
    }

    if(!isGCActivated) return;
    
    if(isDetailsPage) {
      const order = JSON.parse(JSON.stringify(state.current));
      
      order.part.items?.map((currentItem: any) => {
        if(currentItem.orderId === orderId && currentItem.orderItemSeqId === item.orderItemSeqId) {
          currentItem.isGCActivated = true;
          currentItem.gcInfo = gcInfo
        }
      })
      commit(types.ORDER_CURRENT_UPDATED, { order })
      return;
    }

    const orders = orderType === "packed" ? JSON.parse(JSON.stringify(state.packed.list)) : JSON.parse(JSON.stringify(state.completed.list));
    orders.map((order: any) => {
      if(order.orderId === orderId) {
        order.parts.map((part: any) => {
          part.items.map((currentItem: any) => {
            if(currentItem.orderItemSeqId === item.orderItemSeqId) {
              currentItem.isGCActivated = true;
              currentItem.gcInfo = gcInfo;
            }
          })
        })
      }
    })
    orderType === "packed" ? commit(types.ORDER_PACKED_UPDATED, { orders: orders, total: state.packed.total }) : commit(types.ORDER_COMPLETED_UPDATED, { orders: orders, total: state.completed.total })
  }
}

export default actions;
