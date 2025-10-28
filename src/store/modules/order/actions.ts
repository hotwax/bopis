import { ActionTree } from 'vuex';
import RootState from '@/store/RootState';
import OrderState from './OrderState';
import * as types from './mutation-types';
import { OrderService } from '@/services/OrderService';
import { UtilService } from "@/services/UtilService";
import { showToast, getCurrentFacilityId, getPickerName } from "@/utils";
import { isKit, removeKitComponents, getOrderCategory } from '@/utils/order';
import { hasError } from '@/adapter';
import { translate } from "@hotwax/dxp-components";
import emitter from '@/event-bus';
import store from "@/store";
import { prepareOrderQuery } from "@/utils/solrHelper";
import logger from "@/logger";

const actions: ActionTree<OrderState, RootState> = {

  async getOrderDetails({ dispatch, commit }, payload) {
    const orderQueryPayload = prepareOrderQuery({
      ...payload,
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER',
      '-fulfillmentStatus': '(Cancelled OR Rejected OR Completed)',
    });

    try {
      const resp = await OrderService.fetchOrderItems(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        const orderIds = resp.data.grouped.orderId.groups.map((order: any) => order.doclist.docs[0].orderId);
        await dispatch('fetchOrderItems', { ...payload, orderIds });
      } else {
        commit(types.ORDER_INFO_UPDATED, { orders: {} });
      }
      return resp;
    } catch (err) {
      logger.error('getOrderDetails error:', err);
      commit(types.ORDER_INFO_UPDATED, { orders: {} });
    }
  },

  async fetchOrderItems({ commit }, payload) {
    const { productId, orderIds, ...params } = payload;
    const orderQueryPayload = prepareOrderQuery({
      ...params,
      orderIds,
      orderStatusId: 'ORDER_APPROVED',
      orderTypeId: 'SALES_ORDER',
    });

    try {
      const resp = await OrderService.fetchOrderItems(orderQueryPayload);
      if (!hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
        const productIds: string[] = [];
        const orders = resp.data.grouped.orderId.groups.map((order: any) => {
          const orderItem = order.doclist.docs[0];
          let currentItem: any = {};
          let currentItemQty = 0;
          const otherItemsObj: Record<string, any> = {};

          order.doclist.docs.forEach((item: any) => {
            if (item.productId === productId) {
              currentItemQty += item.itemQuantity;
              if (!currentItem.productId) currentItem = item;
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
            customer: { partyId: orderItem.customerId, name: orderItem.customerName },
            shipmentMethod: {
              shipmentMethodTypeDesc: orderItem.shipmentMethodTypeDesc,
              shipmentMethodTypeId: orderItem.shipmentMethodTypeId,
            },
            currentItem,
            otherItems,
          };
        });

        productIds.push(productId);
        store.dispatch('product/fetchProducts', { productIds });
        commit(types.ORDER_INFO_UPDATED, { orders });
      } else {
        commit(types.ORDER_INFO_UPDATED, { orders: {} });
      }
      return resp;
    } catch (err) {
      logger.error('fetchOrderItems error:', err);
      commit(types.ORDER_INFO_UPDATED, { orders: {} });
    }
  },

  async getOpenOrders({ commit, dispatch, state }, params) {
    if (params.viewIndex === 0) emitter.emit("presentLoader");

    const defaultParams = {
      keyword: params.queryString || '',
      facilityId: params.facilityId,
      orderStatusId: 'ORDER_APPROVED',
      shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
      shipmentStatusId_op: 'in',
      shipmentStatusId_not: 'Y',
      pageSize: process.env.VUE_APP_VIEW_SIZE,
      pageIndex: params.viewIndex
    };

    const finalParams = store.state.user.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS']
      ? { ...defaultParams, shipmentMethodTypeId: 'STOREPICKUP', shipmentMethodTypeId_op: 'equals', shipmentMethodTypeId_not: 'Y' }
      : defaultParams;

    try {
      const resp = await OrderService.getOpenOrders(finalParams);
      if (resp.status === 200 && !hasError(resp) && resp.data.orders.length > 0) {
        const ordersResp = resp.data.orders;
        const productIds = ordersResp.flatMap((order: any) =>
          order.shipGroups.flatMap((group: any) => group.items.map((item: any) => item.productId))
        );

        await dispatch('product/fetchProducts', { productIds });

        let orders = ordersResp.map((order: any) => ({
          ...order,
          shipGroups: order.shipGroups.map((group: any) => ({
            ...group,
            items: group.items.map((item: any) => ({ ...item, showKitComponents: false }))
          })),
          isPicked: order.picklistId ? "Y" : "N"
        }));

        const total = resp.data.ordersCount;
        if (params.pageIndex > 0) orders = state.open.list.concat(orders);
        commit(types.ORDER_OPEN_UPDATED, { orders, total });
      } else {
        commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 });
        showToast(translate("Orders Not Found"));
      }
    } catch (err) {
      logger.error('getOpenOrders error:', err);
      showToast(translate("Something went wrong"));
    } finally {
      emitter.emit("dismissLoader");
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
    };

    try {
      const resp = await OrderService.fetchPicklists(payload);
      if (!hasError(resp)) {
        const pickersMap: Record<string, any> = {};
        resp.data.forEach((shipment: any) => {
          const shipmentId = shipment.shipmentId;
          const allRoles = shipment.picklistShipment?.flatMap((ps: any) =>
            (ps.picklist?.roles ?? []).filter((role: any) => !role.thruDate)
          ) || [];

          const pickers = allRoles
            .map((role: any) => role?.partyGroup?.groupName?.trim() || [role?.person?.firstName, role?.person?.lastName].filter(Boolean).join(" ").trim() || role?.partyId || null)
            .filter(Boolean)
            .join(", ");

          const pickerIds = allRoles.map((role: any) => role.partyId);
          pickersMap[shipmentId] = { shipmentId, pickers, pickerIds };
        });
        return pickersMap;
      } else throw resp.data;
    } catch (err) {
      logger.error('fetchPickersInformation error:', err);
      return {};
    }
  },

  async updateCurrent({ commit }, payload) {
    commit(types.ORDER_CURRENT_UPDATED, { order: payload.order });
  },

  async updateCurrentOrderInfo({ commit }, order) {
    commit(types.ORDER_CURRENT_UPDATED, { order });
  },

  async updateOrderItemFetchingStatus({ commit, state }, payload) {
    const order = state.current ? JSON.parse(JSON.stringify(state.current)) : {};
    order.shipGroups?.forEach((shipGroup: any) => {
      if (shipGroup.shipGroupSeqId === payload.shipGroupSeqId) {
        shipGroup.items?.forEach((item: any) => {
          if (item.productId === payload.productId) item.isFetchingStock = !item.isFetchingStock;
        });
      }
    });
    commit(types.ORDER_CURRENT_UPDATED, { order });
  },

  clearOrders({ commit }) {
    commit(types.ORDER_OPEN_UPDATED, { orders: {}, total: 0 });
    commit(types.ORDER_PACKED_UPDATED, { orders: {}, total: 0 });
    commit(types.ORDER_COMPLETED_UPDATED, { orders: {}, total: 0 });
    commit(types.ORDER_CURRENT_UPDATED, { order: {} });
  },

  // Other actions like getPackedOrders, getCompletedOrders, deliverShipment, packShipGroupItems, rejectItems
  // can be added here following the same clean structure.


//export default actions;

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
        showToast(translate("Orders Not Found"));
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
        showToast(translate("Orders Not Found"));
      }

      emitter.emit("dismissLoader");
      return resp;
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
      emitter.emit("dismissLoader");
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

  async packDeliveryItems ({ commit }, params) {
    params = {
      facilityId: getCurrentFacilityId(),
      ...params
    }
    return await OrderService.packOrder(params)
  },

  async packShipGroupItems ({ state, dispatch, commit }, payload) {
    emitter.emit("presentLoader")

    const params = {
      orderId: payload.order.orderId,
      facilityId: payload.shipGroup.facilityId,
      shipmentId: payload.shipGroup.shipmentId
    }
    
    let resp;

    try {
      resp = await OrderService.packOrder(params)
      if (resp.status === 200 && !hasError(resp)) {        
        const shipmentMethodTypeId = payload.shipGroup?.shipmentMethodTypeId
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

    emitter.emit("dismissLoader")
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

  async rejectOrderItems ({ commit }, order) {
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

  // // clearning the orders state when logout, or user store is changed
  // clearOrders ({ commit }) {
  //   commit(types.ORDER_OPEN_UPDATED, {orders: {} , total: 0})
  //   commit(types.ORDER_PACKED_UPDATED, {orders: {} , total: 0})
  //   commit(types.ORDER_COMPLETED_UPDATED, {orders: {} , total: 0})
  //   commit(types.ORDER_CURRENT_UPDATED, { order: {} });
  // },

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
        await this.dispatch('product/getProductInformation', { orders: shipGroups })
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
        items: ([{items: reservedShipGroupForOrder.doclist.docs}])[0]?.items,
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
    order['shipGroups'] = shipGroups
    commit(types.ORDER_CURRENT_UPDATED, {order})

    return shipGroups;
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
  }
}

export default actions;
