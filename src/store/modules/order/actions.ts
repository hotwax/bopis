import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { showToast } from "@/utils";
import { hasError } from '@/adapter'
import { translate } from "@/i18n";
import emitter from '@/event-bus'
import store from "@/store";
import { prepareOrderQuery } from "@/utils/solrHelper";

const actions: ActionTree<OrderState , RootState> ={
  async getOpenOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.preference.showShippingOrders ? 'STOREPICKUP' : '',
      '-shipmentStatusId': '*',
      '-fulfillmentStatus': '(Cancelled OR Rejected)',
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER'
    })

    try {
      resp = await OrderService.getOpenOrders(orderQueryPayload)
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {

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
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
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
                    inventoryItemId: item.inventoryItemId
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
                  inventoryItemId: item.inventoryItemId
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate,
            shippingInstructions: orderItem.shippingInstructions
          }
        })

        const total = resp.data.grouped?.orderId?.ngroups;

        this.dispatch('product/getProductInformation', { orders })

        if(payload.viewIndex && payload.viewIndex > 0) orders = state.open.list.concat(orders)
        commit(types.ORDER_OPEN_UPDATED, { orders, total })
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async getOrderDetail( { dispatch, state }, payload ) {
    const current = state.current as any
    const orders = JSON.parse(JSON.stringify(state.open.list)) as any
    if(current.orderId === payload.orderId) { 
      this.dispatch('product/getProductInformation', { orders: [ current ] })
      return current 
    }
    if(orders.length) {
      const order = orders.find((order: any) => {
        return order.orderId === payload.orderId;
      })
      if(order) {
        dispatch('updateCurrent', { order })
        return order;
      }
    }
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.preference.showShippingOrders ? 'STOREPICKUP' : '',
      '-shipmentStatusId': '*',
      '-fulfillmentStatus': '(Cancelled OR Rejected)',
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER'
    })
    
    let resp;
    try {
      resp = await OrderService.getOrderDetails(orderQueryPayload)
      if (resp.status === 200 && !hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        const orders = resp.data.grouped?.orderId?.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0]
          return {
            orderId: orderItem.orderId,
            orderName: orderItem.orderName,
            customer: {
              partyId: orderItem.customerId,
              name: orderItem.customerName
            },
            statusId: orderItem.orderStatusId,
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
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
                    quantity: item.itemQuantity
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId,
                  quantity: item.itemQuantity
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate,
            shippingInstructions: orderItem.shippingInstructions
          }
        })

        this.dispatch('product/getProductInformation', { orders })
        dispatch('updateCurrent', { order: orders[0] })
      } else {
        showToast(translate("Order not found"))
      }
    } catch (err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }
  },

  updateCurrent ({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order })
  },

  async getPackedOrders ({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    let resp;
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      shipmentMethodTypeId: !store.state.user.preference.showShippingOrders ? 'STOREPICKUP' : '',
      shipmentStatusId: "SHIPMENT_PACKED",
      orderTypeId: 'SALES_ORDER',
      '-fulfillmentStatus': '(Cancelled OR Rejected)',
    })

    try {
      resp = await OrderService.getPackedOrders(orderQueryPayload)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {
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
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
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
                    facilityId: item.facilityId
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate,
            shippingInstructions: orderItem.shippingInstructions,
            pickers: orderItem.pickers ? (orderItem.pickers.reduce((names: any, picker: string) => {
              names.push(picker.split('/')[1]);
              return names;
            }, [])).join(', ') : ""
          }
        })
        this.dispatch('product/getProductInformation', { orders });

        const total = resp.data.grouped?.orderId?.ngroups;

        if(payload.viewIndex && payload.viewIndex > 0) orders = state.packed.list.concat(orders)
        commit(types.ORDER_PACKED_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
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
      shipmentMethodTypeId: !store.state.user.preference.showShippingOrders ? 'STOREPICKUP' : '',
      orderItemStatusId: "ITEM_COMPLETED",
      orderTypeId: 'SALES_ORDER',
      docType: 'ORDER'
    })

    try {
      resp = await OrderService.getCompletedOrders(orderQueryPayload)
      if (resp.status === 200 && resp.data.grouped?.orderId?.ngroups > 0 && !hasError(resp)) {
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
            parts: order.doclist.docs.reduce((arr: Array<any>, item: any) => {
              const currentOrderPart = arr.find((orderPart: any) => orderPart.orderPartSeqId === item.shipGroupSeqId)
              if (!currentOrderPart) {
                arr.push({
                  orderPartSeqId: item.shipGroupSeqId,
                  items: [{
                    orderItemSeqId: item.orderItemSeqId,
                    productId: item.productId,
                    facilityId: item.facilityId
                  }]
                })
              } else {
                currentOrderPart.items.push({
                  orderItemSeqId: item.orderItemSeqId,
                  productId: item.productId,
                  facilityId: item.facilityId
                })
              }

              return arr
            }, []),
            placedDate: orderItem.orderDate
          }
        })
        this.dispatch('product/getProductInformation', { orders });

        const total = resp.data.grouped?.orderId?.ngroups;

        if(payload.viewIndex && payload.viewIndex > 0) orders = state.completed.list.concat(orders)
        commit(types.ORDER_COMPLETED_UPDATED, { orders, total })
        if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_COMPLETED_UPDATED, { orders: {}, total: 0 })
        showToast(translate("Orders Not Found"))
      }
      emitter.emit("dismissLoader");
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    return resp;
  },

  async deliverShipment ({ state, commit }, order) {
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
        showToast(translate('Order delivered to', {customerName: order.customer.name}))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
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

    if (store.state.user.preference.configurePicker) {
      let resp;

      const items = payload.order.parts[0].items;
      const formData = new FormData();
      formData.append("facilityId", items[0].facilityId);
      items.map((item: any, index: number) => {
        formData.append("itemStatusId_o_"+index, "PICKITEM_PENDING")
        formData.append("pickerIds_o_"+index, payload.selectedPicker)
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
          const shipmentId = resp.data._EVENT_MESSAGE_.match(/\d+/g)[0]
          await dispatch('packDeliveryItems', shipmentId).then((data) => {
            if (!hasError(data) && !data.data._EVENT_MESSAGE_) {
              showToast(translate("Something went wrong"))
            } else {
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
        }
        // Mark current order as ready to handover
        dispatch('updateCurrent', { order : { ...payload.order, readyToHandover: true } })

        showToast(translate("Order packed and ready for delivery"))
      } else {
        showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
    } catch(err) {
      console.error(err)
      showToast(translate("Something went wrong"))
    }

    emitter.emit("dismissLoader")
    return resp;
  },

  // TODO: handle the unfillable items count
  async setUnfillableOrderOrItem ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("rejectOrderItems", payload).then((resp) => {
      const refreshPickupOrders = resp.find((response: any) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
      if (refreshPickupOrders) {
        showToast(payload.part.items.length === 1 ? translate('Item has been rejected successfully') : translate('All items were canceled from the order') + ' ' + payload.orderId);
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
        orderFacilityId: this.state.user.currentFacility.facilityId
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
      console.error(err)
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
        orderFacilityId: this.state.user.currentFacility.facilityId
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
      console.error(err)
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
        orderFacilityId: this.state.user.currentFacility.facilityId
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
      console.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
      commit(types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED, { orders: completedOrders, total: resp.data?.count ? resp.data.count : 0 })
    }

    return resp;
  },

  async getOrderItemRejHistory({ commit, state }, payload) {
    let rejectionHistory = [] as any;

    try {
      const params = {
        inputFields: {
          orderId: payload.orderId,
          orderId_op: "equals",
          changeReasonEnumId: payload.rejectReasons,
          changeReasonEnumId_op: "in",
        },
        fieldList: ['orderItemSeqId', 'changeDatetime', 'changeUserLogin'],
        entityName: 'OrderFacilityChange',
        orderBy: 'changeDatetime DESC',
        viewSize: 20,
      }
      const resp = await OrderService.getOrderItemRejHistory(params);

      if (!hasError(resp) && resp.data.count > 0) {
        rejectionHistory = resp.data.docs;
      } else {
        throw resp.data
      }
    } catch (err) {
      console.error('Failed to fetch order item rejection history', err)
    }

    commit(types.ORDER_ITEM_REJECTION_HISTORY_UPDATED, rejectionHistory)
  },

  // clearning the orders state when logout, or user store is changed
  clearOrders ({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_PACKED_UPDATED, {orders: {} , total: 0})
    commit(types.ORDER_COMPLETED_UPDATED, {orders: {} , total: 0})
  }
}

export default actions;
