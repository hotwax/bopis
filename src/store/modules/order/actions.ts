import { OrderService } from "@/services/OrderService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'
import { showToast, getCurrentFacilityId, getPickerName } from "@/utils";
import { isKit, removeKitComponents } from '@/utils/order'
import { hasError } from '@/adapter'
import { translate } from "@hotwax/dxp-components";
import emitter from '@/event-bus'
import store from "@/store";
import { prepareOrderQuery } from "@/utils/solrHelper";
import { getOrderCategory } from '@/utils/order'
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

  async getOpenOrders({ commit, state }, params) {
    // Show loader only when new query and not the infinite scroll
    if (params.viewIndex === 0) emitter.emit("presentLoader");

    params = {
      keyword: params.queryString || '',
      facilityId: params.facilityId,
      orderStatusId: 'ORDER_APPROVED',
      shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
      shipmentStatusId_op: 'in',
      shipmentStatusId_not: 'Y',    
      pageSize: process.env.VUE_APP_VIEW_SIZE,
      pageIndex: params.viewIndex
    } as any;

    if(store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS']) {
      params = {
        shipmentMethodTypeId: 'STOREPICKUP',
        shipmentMethodTypeId_op: 'equals',
        shipmentMethodTypeId_not: 'Y',
        ...params
      }
    }

    try {
      const resp = await OrderService.getOpenOrders(params);

      if (resp.status === 200 && !hasError(resp) && resp?.data?.orders.length > 0) {
        const ordersResp = resp.data.orders;

        // Collect all productIds
        const productIds = ordersResp.flatMap((order: any) => 
          order.shipGroups.flatMap((group: any) => group.items.map((item: any) => item.productId))
        );

        await this.dispatch('product/fetchProducts', { productIds });

        let orders = ordersResp.map((order: any) => {
          // Add showKitComponents to each item in shipGroups
          const shipGroups = order.shipGroups.map((group: any) => ({
            ...group,
            items: group.items.map((item: any) => ({
              ...item,
              showKitComponents: false
            }))
          }));
          return {
            ...order,
            shipGroups,
            isPicked: order.picklistId ? "Y" : "N",
          };
        });

        const total = resp.data.ordersCount;

        if (params.pageIndex && params.pageIndex > 0) {
          orders = state.open.list.concat(orders);
        }

        commit(types.ORDER_OPEN_UPDATED, { orders, total });
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 });
      }

      emitter.emit("dismissLoader");
      return resp;

    } catch (err) {
      logger.error(err);
      emitter.emit("dismissLoader");
      showToast(translate("Something went wrong"));
    }
  },

  async fetchPickersInformation(_, { shipmentIds, shipmentStatusId }) {
    const payload = {
      shipmentId: shipmentIds.join(','),
      shipmentId_op: 'in',
      originalFacilityId: getCurrentFacilityId(),
      statusId: shipmentStatusId,
      pageIndex: 0,
      pageSize: shipmentIds.length
    }
    try {
      const resp = await OrderService.fetchPicklists(payload);
      if (!hasError(resp)) {
        const shipments = resp.data;

        // Build a map of shipmentId -> { shipmentId, pickers, pickerIds }
        const pickersMap = {} as any;

        shipments.forEach((shipment: any) => {
          const shipmentId = shipment.shipmentId;
          const allRoles = shipment.picklistShipment?.flatMap((picklistShipment: any) =>
            (picklistShipment.picklist?.roles ?? []).filter((role: any) => !role.thruDate)
          ) || [];

          const pickers = allRoles
              .map((role: any) => 
                role?.partyGroup?.groupName?.trim() ||
                [role?.person?.firstName, role?.person?.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                role?.partyId ||
                null
              )
              .filter(Boolean)
              .join(", ");

          const pickerIds = allRoles.map((role: any) => role.partyId);

          pickersMap[shipmentId] = { shipmentId, pickers, pickerIds };
        });
      return pickersMap;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to fetch picklists', err);
    return {};
  }
  },

  async getOrderDetail({ dispatch }, { payload, orderType }) {
    const orderId = payload.orderId;
    let currentOrder = {} as any;

    try {
    const resp = await OrderService.fetchOrderDetails(orderId);

    if (resp.status === 200 && !hasError(resp) && resp.data) {
      const data = resp.data.orderDetail;
      // Fetch products used in shipGroups
      const productIds = data.shipGroups.flatMap((group: any) =>
        group.items.map((item: any) => item.productId)
      );
      await this.dispatch('product/fetchProducts', { productIds });

      const sortedPaymentPreference = [...data.paymentPreferences].sort((a: any, b: any) => (b.createdDate || 0) - (a.createdDate || 0));

      // Add showKitComponents to each item in shipGroups and remove cancelled items
      const shipGroups = data.shipGroups.map((group: any) => {
        const validItems = group.items.filter(
          (item: any) => item.itemStatusId !== 'ITEM_CANCELLED'
        )

        return {
          ...group,
          category: getOrderCategory(group),
          items: removeKitComponents(validItems).map((item: any) => ({
            ...item,
            showKitComponents: false
          }))
        };
      });

      const order = {
        ...data,
        shipGroups,
        statusId: data.orderStatusId,
        customerId: data.partyId,
        customerName: (`${data.customerFirstName || ""} ${data.customerLastName || ""}`).trim(),
        shopifyOrderId: data.orderExternalId,
        approvedDate: data.statuses?.find((status: any) => status.statusId === "ORDER_APPROVED")?.statusDatetime,
        completedDate: data.statuses?.find((status: any) => status.statusId === "ORDER_COMPLETED")?.statusDatetime,
        paymentPreferences: sortedPaymentPreference
      };

      // Assign currentShipGroup and related fields
      const currentFacilityId = getCurrentFacilityId();
      const currentShipGroup = order.shipGroups.find((shipGroup: any) => shipGroup.shipGroupSeqId === payload.shipGroupSeqId && shipGroup.facilityId === currentFacilityId);

      if (currentShipGroup) {
        if (currentShipGroup.shipmentMethodTypeId === 'STOREPICKUP') {
          order.readyToHandover = currentShipGroup.category === "Packed"
          order.handovered = currentShipGroup.category === "Completed"
        } else {
          order.readyToShip = currentShipGroup.category === "Packed"
          order.shipped = currentShipGroup.category === "Completed"
        }
        order.shipGroup = currentShipGroup;
        order.picklistId = currentShipGroup.picklistId || null;
        order.isPicked = !!currentShipGroup.picklistId;
        order.pickerIds = currentShipGroup.pickerId ? [currentShipGroup.pickerId] : [];
        order.pickers = getPickerName(currentShipGroup.pickerGroupName, currentShipGroup.pickerFirstName, currentShipGroup.pickerLastName) || currentShipGroup.pickerId;
        order.shipGroupSeqId = currentShipGroup.shipGroupSeqId;
      }

      // If gift card activation details needed for non-open orders
      if (orderType !== "open") {
        const enrichedOrder = await OrderService.fetchGiftCardActivationDetails({
          isDetailsPage: true,
          currentOrders: [order]
        });
        currentOrder = enrichedOrder;
      } else {
        currentOrder = order;
      }

      if (!order.shipGroup) {
        currentOrder.orderId = null;
      }
      const partyIds = [...new Set(data.shipGroups.map((shipgroup:any) => shipgroup.carrierPartyId))];


      await this.dispatch('util/fetchPartiesInformation',partyIds);
      await dispatch('updateCurrent', { order: { ...currentOrder, orderType } });

    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error(err);
  }
  },

  async updateCurrent ({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order })
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

  async getPackedOrders ({ commit, dispatch, state }, params) {
    // Show loader only when new query and not the infinite scroll
    if (params.viewIndex === 0) emitter.emit("presentLoader");
    let resp;

    params = {
      keyword: params.queryString || '',
      ...params
    }
    try {
      resp = await OrderService.findPackedShipments(params)
      if (!hasError(resp) && resp.data.shipments) {
        const shipments = resp.data.shipments;
        const productIds = [] as any;
        const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);

        const pickers = await dispatch("fetchPickersInformation", { shipmentIds, shipmentStatusId: 'SHIPMENT_PACKED' });

        let total = resp.data.shipmentCount;
        // Prepare orders from shipment response
        let orders = shipments.map((shipment: any) => {
          // Filter out cancelled items, Skip this shipment if no valid items are left
          // TODO: This should be handled at the backend, as it's not valid to have cancelled items in a packed shipment. Remove this check once backend is fixed.
          const validItems = shipment.items.filter((item: any) => item.orderItemStatusId !== 'ITEM_CANCELLED');
          if (validItems.length === 0) {
            total -= 1;
            return null;
          }
          productIds.push(...validItems.map((item: any) => item.productId));
          
          const pickersInfo = pickers[shipment.shipmentId] || { pickers: "", pickerIds: [] };

          return {
            ...shipment,
            items: removeKitComponents(validItems),
            customerId: shipment.partyId,
            customerName: `${shipment.firstName || ''} ${shipment.lastName || ''}`.trim(),            
            pickers: pickersInfo.pickers,
            pickerIds: pickersInfo.pickerIds
          };
        }).filter((order: any) => order !== null); // Remove shipments with no items i.e. the case where all the items within the shipment are cancelled

        await this.dispatch('product/fetchProducts', { productIds });

        const packedOrders = await OrderService.fetchGiftCardActivationDetails({
          isDetailsPage: false,
          currentOrders: orders
        });

        orders = params.viewIndex && params.viewIndex > 0 ? state.packed.list.concat(packedOrders) : packedOrders;

        commit(types.ORDER_PACKED_UPDATED, { orders, total });

        if (params.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 });
      }

      emitter.emit("dismissLoader");
      return resp;
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
      emitter.emit("dismissLoader");
    }
  },

  async getCompletedOrders ({ commit, dispatch, state }, params) {
    if (params.viewIndex === 0) emitter.emit("presentLoader");

    params = {
      keyword: params.queryString || '',
      ...params
    }

    try {
      const resp = await OrderService.findCompletedShipments(params);

      if (!hasError(resp) && resp.data.shipments) {
        const shipments = resp.data.shipments;
        const productIds = [] as any;
        const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);

        // Fetch pickers info
        const pickers = await dispatch("fetchPickersInformation", { shipmentIds, shipmentStatusId: 'SHIPMENT_SHIPPED' });

        let total = resp.data.shipmentCount;
        // Map each shipment into the desired structure
        let orders = shipments.map((shipment: any) => {
          // Filter out cancelled items, Skip this shipment if no valid items are left
          // TODO: This should be handled at the backend, as it's not valid to have cancelled items in a packed shipment. Remove this check once backend is fixed.
          const validItems = shipment.items.filter((item: any) => item.orderItemStatusId !== 'ITEM_CANCELLED');
          // Skip this shipment if no valid items are left
          if (validItems.length === 0) {
            total -= 1;
            return null;
          }

          productIds.push(...validItems.map((item: any) => item.productId));

          const pickersInfo = pickers[shipment.shipmentId] || { pickers: "", pickerIds: [] };

          return {
            ...shipment,
            items: removeKitComponents(validItems),
            customerId: shipment.partyId,
            customerName: `${shipment.firstName || ''} ${shipment.lastName || ''}`.trim(),            
            pickers: pickersInfo.pickers,
            pickerIds: pickersInfo.pickerIds
          };
        }).filter((order: any) => order !== null); // Remove shipments with no items i.e. the case where all the items within the shipment are cancelled

        await this.dispatch('product/fetchProducts', { productIds });

        const completedOrders = await OrderService.fetchGiftCardActivationDetails({
          isDetailsPage: false,
          currentOrders: orders
        });

        orders = params.viewIndex && params.viewIndex > 0 ? state.completed.list.concat(completedOrders) : completedOrders;

        commit(types.ORDER_COMPLETED_UPDATED, { orders, total });
        if (params.viewIndex === 0) emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_COMPLETED_UPDATED, { orders: {}, total: 0 });
      }

      emitter.emit("dismissLoader");
      return resp;
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
      emitter.emit("dismissLoader");
    }
  },

  async getCommunicationEvents({ commit }, params) {
    try {
      const completedOrdersList = params.orders.map((completedOrderData: any) => completedOrderData.orderId);

      const orderCommunicationEvents = store.getters['order/getCommunicationEvents'];

      const filteredOrdersList = completedOrdersList.filter((orderId: any) => {
        return !orderCommunicationEvents.some((currentOrderData: any) => currentOrderData.orderId === orderId);
      });

      if (filteredOrdersList.length === 0) return orderCommunicationEvents;

      const resp = await OrderService.getCommunicationEvents({
        orderIds: filteredOrdersList,
        communicationEventTypeId: "SYS_MSG_EMAIL_COMM",
        reasonEnumId: "HANDOVER_PROOF",
      });

      if (!hasError(resp) && resp.data && resp.data.communicationEventList) {
        const mergedOrdersList = [...orderCommunicationEvents, ...(resp.data.communicationEventList || [])];
        commit(types.ORDER_COMMUNICATION_EVENTS_UPDATED, { communicationEvents: mergedOrdersList });
        return resp.data.communicationEventList;
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
    }
  },

  async deliverShipment ({ state, dispatch, commit }, order) {
    emitter.emit("presentLoader");

    const params = {
      shipmentId: order.shipmentId,
    }

    let resp;

    try {
      resp = await OrderService.shipOrder(params)
      if (!hasError(resp)) {
        // Remove order from the list if action is successful
        const orderIndex = state.packed.list.findIndex((packedOrder: any) => {
          return packedOrder.orderId === order.orderId && order.primaryShipGroupSeqId === packedOrder.primaryShipGroupSeqId;
        });
        if (orderIndex > -1) {
          state.packed.list.splice(orderIndex, 1);
          commit(types.ORDER_PACKED_UPDATED, { orders: state.packed.list, total: state.packed.total -1 })
        }

        if(order.shipmentMethodTypeId === 'STOREPICKUP'){
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

  async deliverShipmentFromDetail ({ state, dispatch, commit }, order) {
    emitter.emit("presentLoader");

    const params = {
      shipmentId: order.shipGroup.shipmentId,
    }

    let resp;

    try {
      resp = await OrderService.shipOrder(params)
      if (!hasError(resp)) {     // Remove order from the list if action is successful
        if (Object.keys(state.packed.list).length) {
          const orderIndex = state.packed.list.findIndex((packedOrder: any) => {
            return packedOrder.orderId === order.orderId && order.shipGroup.shipGroupSeqId === packedOrder.primaryShipGroupSeqId;
          });
          if (orderIndex > -1) {
            state.packed.list.splice(orderIndex, 1);
            commit(types.ORDER_PACKED_UPDATED, { orders: state.packed.list, total: state.packed.total -1 })
          }
        }

        if(order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP'){
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

  async packShipGroupItems ({ dispatch }, payload) {
    const params = {
      orderId: payload.order.orderId,
      facilityId: payload.shipGroup.facilityId,
      shipmentId: payload.shipGroup.shipmentId
    }
    
    let resp;

    try {
      resp = await OrderService.packOrder(params)
      if (resp.status === 200 && !hasError(resp)) {
        dispatch("removeOpenOrder", payload)

        // Adding readyToHandover or readyToShip because we need to show the user that the order has moved to the packed tab
        if(payload.order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP') {
          payload.order = { ...payload.order, readyToHandover: true }
        } else {
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
    } finally {
      emitter.emit("dismissLoader")
    }

    return resp;
  },

  async removeOpenOrder({ commit, state }, payload) {
    const orders = JSON.parse(JSON.stringify(state.open.list));

    const orderIndex = orders?.findIndex((order: any) => {
      return order.orderId === payload.order.orderId && order.shipGroups.some((shipGroup: any) => {
        return shipGroup.shipGroupSeqId === payload.shipGroup.shipGroupSeqId;
      });
    });

    if (orderIndex > -1) {
      orders.splice(orderIndex, 1);
      commit(types.ORDER_OPEN_UPDATED, { orders, total: state.open.total -1 })
    }
  },

  // TODO: handle the unfillable items count
  async rejectItems ({ dispatch }, payload) {
    emitter.emit("presentLoader");
    return await dispatch("rejectOrderItems", payload).then((resp) => {
      const refreshPickupOrders = resp.find((response: any) => response.data);
      if (refreshPickupOrders) {
        showToast(translate(payload.isEntireOrderRejected ? 'All items were rejected from the order' : 'Some items were rejected from the order') + ' ' + (payload.orderName ? payload.orderName : payload.orderId));
      } else {
        showToast(translate('Something went wrong'));
      }
      emitter.emit("dismissLoader");
      return resp;
    }).catch(err => err);
  },

  async rejectOrderItems (_, order) {
    const itemsToReject = order.shipGroup.items    
    .map((item: any) => ({
      ...item,
      updateQOH: false,
      rejectionReasonId: item.reason,
      kitComponents: isKit(item) ? item.rejectedComponents || [] : []
    }));

    const payload = {
      orderId: order.orderId,
      rejectToFacilityId: 'PICKUP_REJECTED',
      items: itemsToReject
    }
    try {
      const response = await OrderService.rejectOrderItems(payload);
      return [response];
    } catch (err) {
      logger.error(err)
      return err
    }
  },

  async getShipToStoreIncomingOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      orderFacilityId: getCurrentFacilityId(),
      orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
      statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
      shipmentMethodTypeId: 'SHIP_TO_STORE',
      shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
      pageSize: payload.viewSize || process.env.VUE_APP_VIEW_SIZE,
      pageIndex: payload.viewIndex || 0
    } as any
    if(payload.queryString?.trim()?.length){
      params.keyword = payload.queryString.trim();
    }
    let incomingOrders = [] as any
    try {
      resp = await OrderService.getShipToStoreOrders(params)
  
      if (!hasError(resp)) {
        const ordersResp = resp.data.orders;
        const orderCount = state.shipToStore.incoming.orderCount + resp.data.orders.length;
        incomingOrders = ordersResp.flatMap((order: any) => {
          const shipGroups = order.shipGroups||[];
          
          return shipGroups.map((shipGroup: any) => {
            return {
              customerName:order.customerName,
              orderDate:order.orderDate,
              orderId:order.orderId,
              orderName: order.orderName,
              ...shipGroup
            }
          })
          
        })
        
        let productIds: any = new Set();

        incomingOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })

        const total = resp.data.ordersCount;
     
        if (payload.viewIndex && payload.viewIndex > 0){
          incomingOrders = state.shipToStore.incoming.list.concat(incomingOrders);
        } 
        commit(types.ORDER_SHIP_TO_STORE_INCOMING_UPDATED, { orders: incomingOrders, total, orderCount });
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_SHIP_TO_STORE_INCOMING_UPDATED, { orders: [], total: 0 });
        showToast(translate("Orders Not Found"))
      }
    } catch (err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
    }
    return resp;
  },

  async getShipToStoreReadyForPickupOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      shipmentStatusId: "SHIPMENT_ARRIVED",
      shipmentMethodTypeId: "SHIP_TO_STORE",
      orderFacilityId: getCurrentFacilityId(),
      statusId:"ITEM_COMPLETED",
      orderStatusId:"ORDER_COMPLETED",
      pageSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
      pageIndex: payload.viewIndex ? payload.viewIndex : 0
    } as any

    if(payload.queryString?.trim()?.length) {
      params.keyword = payload.queryString.trim();
    }

    let readyForPickupOrders = []
    try {
      resp = await OrderService.getShipToStoreOrders(params)
       if (!hasError(resp) ) {
        const ordersResp = resp.data.orders;
        const orderCount = state.shipToStore.readyForPickup.orderCount + resp.data.orders.length;
        readyForPickupOrders = ordersResp.flatMap((order: any) => {
          const shipGroups = order.shipGroups||[];

          return shipGroups.filter((shipGroup: any) => shipGroup.shipmentId != null).map((shipGroup: any) =>  {
            return {
              customerName:order.customerName,
              createdDate:order.orderDate,
              orderId:order.orderId,
              orderName: order.orderName,
              ...shipGroup
              
            }
          })

        })
        let productIds: any = new Set();

        readyForPickupOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })

        const total = resp.data.ordersCount;

        if (payload.viewIndex && payload.viewIndex > 0)
          {
            readyForPickupOrders = state.shipToStore.readyForPickup.list.concat(readyForPickupOrders)
          }
        commit(types.ORDER_SHIP_TO_STORE_RDYFORPCKUP_UPDATED, { orders: readyForPickupOrders, total, orderCount });
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_SHIP_TO_STORE_RDYFORPCKUP_UPDATED, { orders: [], total: 0, orderCount: 0 });
        showToast(translate("Orders Not Found"))
      }
    } catch (err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
    }

    return resp;
  },
  
  async getShipToStoreCompletedOrders({ commit, state }, payload) {
    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader")
    let resp: any

    const params = {
      shipmentStatusId: "SHIPMENT_DELIVERED",
      shipmentMethodTypeId: "SHIP_TO_STORE",
      statusId:"ITEM_COMPLETED",
      orderStatusId:"ORDER_COMPLETED",
      orderFacilityId: getCurrentFacilityId(),
      pageSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
      pageIndex: payload.viewIndex ? payload.viewIndex : 0
    } as any

    if(payload.queryString?.trim()?.length) {
      params.keyword = payload.queryString.trim();
    }
 
    let completedOrders = []
    try {
      resp = await OrderService.getShipToStoreOrders(params)
      if (!hasError(resp)) {
        const ordersResp = resp.data.orders;
        const orderCount = state.shipToStore.completed.orderCount + resp.data.orders.length;
        completedOrders = ordersResp.flatMap((order: any) => {
          const shipGroups = order.shipGroups||[];

          return shipGroups.map((shipGroup: any) => {
            return {
              customerName:order.customerName,
              createdDate:order.orderDate,
              orderId:order.orderId,
              orderName: order.orderName,
              ...shipGroup
            }
          })

        })
        
        let productIds: any = new Set();

        completedOrders.map((order: any) => {
          order.items.map((item: any) => productIds.add(item.productId))
          return productIds
        });

        productIds = [...productIds]
        store.dispatch('product/fetchProducts', { productIds })

        const total = resp.data.ordersCount;


        if (payload.viewIndex && payload.viewIndex>0 ) 
          {
            completedOrders = state.shipToStore.completed.list.concat(completedOrders)
          }
        commit(types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED, { orders: completedOrders, total, orderCount });
        emitter.emit("dismissLoader");
      } else {
        commit(types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED, { orders: [], total: 0 ,orderCount:0});
        showToast(translate("Orders Not Found"))
      }
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"))
    } finally {
      emitter.emit("dismissLoader")
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

  async updateCurrentItemGCActivationDetails({ commit, state }, { item, orderId, orderType, isDetailsPage }) {
    let gcInfo = {};
    let isGCActivated = false;

    try {
      const resp = await UtilService.fetchGiftCardFulfillmentInfo({
          orderId: orderId,
          orderItemSeqId: item.orderItemSeqId        
      })      

      if(!hasError(resp)) {
        isGCActivated = true;
        gcInfo = resp.data[0];
      } else {
        throw resp.data
      }
    } catch(error) {
      logger.error(error)
    }

    if(!isGCActivated) return;
    
    if(isDetailsPage) {
      const order = JSON.parse(JSON.stringify(state.current));
      
      order.shipGroup.items?.map((currentItem: any) => {
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
        order.items.map((currentItem: any) => {
            if(currentItem.orderItemSeqId === item.orderItemSeqId) {
              currentItem.isGCActivated = true;
              currentItem.gcInfo = gcInfo;
            }          
        })
      }
    })
    orderType === "packed" ? commit(types.ORDER_PACKED_UPDATED, { orders: orders, total: state.packed.total }) : commit(types.ORDER_COMPLETED_UPDATED, { orders: orders, total: state.completed.total })
  },
  resetShipToStoreOrdersPagination({ commit }) {
    commit(types.ORDER_SHIP_TO_STORE_INCOMING_UPDATED, { orders: [], total: 0, orderCount: 0 });
    commit(types.ORDER_SHIP_TO_STORE_RDYFORPCKUP_UPDATED, { orders: [], total: 0, orderCount: 0 });
    commit(types.ORDER_SHIP_TO_STORE_COMPLETED_UPDATED, { orders: [], total: 0, orderCount: 0 });
  }
}

export default actions;
