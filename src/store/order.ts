import { defineStore } from "pinia";
import { OrderService } from "@/services/OrderService";
import { commonUtil } from "@/utils/commonUtil";
import { orderUtil } from '@/utils/orderUtil'
import { hasError } from '@/adapter'
import { translate } from "@hotwax/dxp-components";
import emitter from '@/event-bus'
import { solrUtil } from "@/utils/solrUtil";

import { UtilService } from "@/services/UtilService";
import logger from "@/logger";
import { useProductStore } from "./product";
import { useUserStore } from "./user";
import { useUtilStore } from "./util";

export const useOrderStore = defineStore('order', {
  state: () => ({
    open: {
      list: [] as any,
      total: 0
    },
    orderItemRejectionHistory: [] as any,
    current: {} as any,
    packed: {
      list: [] as any,
      total: 0
    },
    completed: {
      list: [] as any,
      total: 0
    },
    shipToStore: {
      incoming: {
        list: [] as any,
        orderCount: 0,
        total: 0
      },
      readyForPickup: {
        list: [] as any,
        total: 0,
        orderCount: 0
      },
      completed: {
        list: [] as any,
        total: 0,
        orderCount: 0
      }
    },
    orders: {} as any,
    communicationEvents: [] as any,
  }),
  getters: {
    getOrders: (state) => state.orders,
    getOpenOrders: (state) => state.open.list,
    getCurrent: (state) => JSON.parse(JSON.stringify(state.current)),
    getPackedOrders: (state) => state.packed.list,
    isPackedOrdersScrollable: (state) => state.packed.list.length > 0 && state.packed.list.length < state.packed.total,
    isOpenOrdersScrollable: (state) => state.open.list.length > 0 && state.open.list.length < state.open.total,
    getCompletedOrders: (state) => state.completed.list,
    isCompletedOrdersScrollable: (state) => state.completed.list.length > 0 && state.completed.list.length < state.completed.total,
    getShipToStoreIncomingOrders: (state) => state.shipToStore.incoming.list,
    isShipToStoreIncmngOrdrsScrlbl: (state) => state.shipToStore.incoming.orderCount > 0 && state.shipToStore.incoming.orderCount < state.shipToStore.incoming.total,
    getShipToStoreReadyForPickupOrders: (state) => state.shipToStore.readyForPickup.list,
    isShipToStoreRdyForPckupOrdrsScrlbl: (state) => state.shipToStore.readyForPickup.orderCount > 0 && state.shipToStore.readyForPickup.orderCount < state.shipToStore.readyForPickup.total,
    getShipToStoreCompletedOrders: (state) => state.shipToStore.completed.list,
    isShipToStoreCmpltdOrdrsScrlbl: (state) => state.shipToStore.completed.orderCount > 0 && state.shipToStore.completed.orderCount < state.shipToStore.completed.total,
    getOrderItemRejectionHistory: (state) => state.orderItemRejectionHistory,
    getIncomingOrdersCount: (state) => state.shipToStore.incoming.orderCount,
    getReadyForPickupOrdersCount: (state) => state.shipToStore.readyForPickup.orderCount,
    getCompletedOrdersCount: (state) => state.shipToStore.completed.orderCount,
    getCommunicationEvents: (state) => state.communicationEvents,
    getCommunicationEventsByOrderId: (state) => (orderId: string) => state.communicationEvents.find((event: any) => event.orderId === orderId)
  },
  actions: {
    async getOrderDetails(payload: any) {
      let resp;
      const orderQueryPayload = solrUtil.prepareOrderQuery({
        ...payload,
        orderStatusId: 'ORDER_APPROVED',
        orderTypeId: 'SALES_ORDER',
        '-fulfillmentStatus': '(Cancelled OR Rejected OR Completed)',
      })

      try {
        resp = await OrderService.fetchOrderItems(orderQueryPayload);
        if (!hasError(resp) && resp.data.grouped?.orderId?.ngroups > 0) {
          const orderIds = resp.data.grouped?.orderId?.groups.map((order: any) => order.doclist.docs[0].orderId);
          await this.fetchOrderItems({ ...payload, orderIds });
        } else {
          this.orders = {};
        }
      } catch (err) {
        logger.error(err)
        this.orders = {};
      }
      return resp;
    },
    async fetchOrderItems(payload: any) {
      let resp;
      const { productId, orderIds, ...params } = payload;
      const orderQueryPayload = solrUtil.prepareOrderQuery({
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
                if (!currentItem.productId) {
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

          const productStore = useProductStore();
          await productStore.fetchProducts({ productIds });
          this.orders = orders;
        } else {
          this.orders = {};
        }
      }
      catch (err) {
        logger.error(err)
        this.orders = {};
      }
      return resp;
    },
    async fetchOpenOrders(params: any) {
      if (params.viewIndex === 0) emitter.emit("presentLoader");

      const userStore = useUserStore();
      const productStore = useProductStore();

      let queryParams = {
        keyword: params.queryString || '',
        facilityId: params.facilityId,
        orderStatusId: 'ORDER_APPROVED',
        shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
        shipmentStatusId_op: 'in',
        shipmentStatusId_not: 'Y',
        pageSize: process.env.VUE_APP_VIEW_SIZE,
        pageIndex: params.viewIndex
      } as any;

      if (userStore.bopisProductStoreSettings['SHOW_SHIPPING_ORDERS']) {
        queryParams = {
          shipmentMethodTypeId: 'STOREPICKUP',
          shipmentMethodTypeId_op: 'equals',
          shipmentMethodTypeId_not: 'Y',
          ...queryParams
        }
      }

      try {
        const resp = await OrderService.getOpenOrders(queryParams);

        if (resp.status === 200 && !hasError(resp) && resp?.data?.orders.length > 0) {
          const ordersResp = resp.data.orders;

          const productIds = ordersResp.flatMap((order: any) =>
            order.shipGroups.flatMap((group: any) => group.items.map((item: any) => item.productId))
          );

          await productStore.fetchProducts({ productIds });

          let orders = ordersResp.map((order: any) => {
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

          if (params.viewIndex && params.viewIndex > 0) {
            orders = this.open.list.concat(orders);
          }

          this.open = { list: orders, total };
          emitter.emit("dismissLoader");
        } else {
          this.open = { list: [], total: 0 };
        }

        emitter.emit("dismissLoader");
        return resp;

      } catch (err) {
        logger.error(err);
        emitter.emit("dismissLoader");
        commonUtil.showToast(translate("Something went wrong"));
      }
    },
    async fetchPickersInformation({ shipmentIds, shipmentStatusId }: { shipmentIds: any, shipmentStatusId: string }) {
      const payload = {
        shipmentId: shipmentIds.join(','),
        shipmentId_op: 'in',
        originalFacilityId: commonUtil.getCurrentFacilityId(),
        statusId: shipmentStatusId,
        pageIndex: 0,
        pageSize: shipmentIds.length
      }
      try {
        const resp = await OrderService.fetchPicklists(payload);
        if (!hasError(resp)) {
          const shipments = resp.data;
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
    async getOrderDetail({ payload, orderType }: { payload: any, orderType: string }) {
      const orderId = payload.orderId;
      let currentOrder = {} as any;

      const productStore = useProductStore();
      const utilStore = useUtilStore();

      try {
        const resp = await OrderService.fetchOrderDetails(orderId);

        if (resp.status === 200 && !hasError(resp) && resp.data) {
          const data = resp.data.orderDetail;
          const productIds = data.shipGroups.flatMap((group: any) =>
            group.items.map((item: any) => item.productId)
          );
          await productStore.fetchProducts({ productIds });

          const sortedPaymentPreference = [...data.paymentPreferences].sort((a: any, b: any) => (b.createdDate || 0) - (a.createdDate || 0));

          const shipGroups = data.shipGroups.map((group: any) => {
            const validItems = group.items.filter(
              (item: any) => item.itemStatusId !== 'ITEM_CANCELLED'
            )

            return {
              ...group,
              category: orderUtil.getOrderCategory(group),
              items: orderUtil.removeKitComponents(validItems).map((item: any) => ({
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

          const currentFacilityId = commonUtil.getCurrentFacilityId();
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
            order.pickers = commonUtil.getPickerName(currentShipGroup.pickerGroupName, currentShipGroup.pickerFirstName, currentShipGroup.pickerLastName) || currentShipGroup.pickerId;
            order.shipGroupSeqId = currentShipGroup.shipGroupSeqId;
          }

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
          const partyIds = [...new Set(data.shipGroups.map((shipgroup: any) => shipgroup.carrierPartyId))];

          await utilStore.fetchPartiesInformation(partyIds);
          this.updateCurrent({ order: { ...currentOrder, orderType } });

        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err);
      }
    },
    updateCurrent(payload: any) {
      this.current = payload.order;
    },
    updateCurrentOrderInfo(order: any) {
      this.current = order;
    },
    async updateOrderItemFetchingStatus(payload: any) {
      const order = this.current ? JSON.parse(JSON.stringify(this.current)) : {};
      order.shipGroups?.find((shipGroup: any) => {
        if (shipGroup.shipGroupSeqId === payload.shipGroupSeqId) {
          shipGroup.items?.find((item: any) => {
            if (item.productId === payload.productId) item.isFetchingStock = !item.isFetchingStock
          });
        }
      })
      this.current = order;
    },
    async fetchPackedOrders(params: any) {
      if (params.viewIndex === 0) emitter.emit("presentLoader");
      let resp;

      const productStore = useProductStore();

      const queryParams = {
        keyword: params.queryString || '',
        ...params
      }
      try {
        resp = await OrderService.findPackedShipments(queryParams)
        if (!hasError(resp) && resp.data.shipments) {
          const shipments = resp.data.shipments;
          const productIds = [] as any;
          const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);

          const pickers = await this.fetchPickersInformation({ shipmentIds, shipmentStatusId: 'SHIPMENT_PACKED' });

          let total = resp.data.shipmentCount;
          let orders = shipments.map((shipment: any) => {
            const validItems = shipment.items.filter((item: any) => item.orderItemStatusId !== 'ITEM_CANCELLED');
            if (validItems.length === 0) {
              total -= 1;
              return null;
            }
            productIds.push(...validItems.map((item: any) => item.productId));

            const pickersInfo = pickers[shipment.shipmentId] || { pickers: "", pickerIds: [] };

            return {
              ...shipment,
              items: orderUtil.removeKitComponents(validItems),
              customerId: shipment.partyId,
              customerName: `${shipment.firstName || ''} ${shipment.lastName || ''}`.trim(),
              pickers: pickersInfo.pickers,
              pickerIds: pickersInfo.pickerIds
            };
          }).filter((order: any) => order !== null);

          await productStore.fetchProducts({ productIds });

          const packedOrders = await OrderService.fetchGiftCardActivationDetails({
            isDetailsPage: false,
            currentOrders: orders
          });

          orders = params.viewIndex && params.viewIndex > 0 ? this.packed.list.concat(packedOrders) : packedOrders;
          this.packed = { list: orders, total };

          if (params.viewIndex === 0) emitter.emit("dismissLoader");
        } else {
          this.packed = { list: [], total: 0 };
        }

        emitter.emit("dismissLoader");
        return resp;
      } catch (err) {
        logger.error(err);
        commonUtil.showToast(translate("Something went wrong"));
        emitter.emit("dismissLoader");
      }
    },
    async fetchCompletedOrders(params: any) {
      if (params.viewIndex === 0) emitter.emit("presentLoader");

      const productStore = useProductStore();

      const queryParams = {
        keyword: params.queryString || '',
        ...params
      }

      try {
        const resp = await OrderService.findCompletedShipments(queryParams);

        if (!hasError(resp) && resp.data.shipments) {
          const shipments = resp.data.shipments;
          const productIds = [] as any;
          const shipmentIds = shipments.map((shipment: any) => shipment.shipmentId);

          const pickers = await this.fetchPickersInformation({ shipmentIds, shipmentStatusId: 'SHIPMENT_SHIPPED' });

          let total = resp.data.shipmentCount;
          let orders = shipments.map((shipment: any) => {
            const validItems = shipment.items.filter((item: any) => item.orderItemStatusId !== 'ITEM_CANCELLED');
            if (validItems.length === 0) {
              total -= 1;
              return null;
            }

            productIds.push(...validItems.map((item: any) => item.productId));
            const pickersInfo = pickers[shipment.shipmentId] || { pickers: "", pickerIds: [] };

            return {
              ...shipment,
              items: orderUtil.removeKitComponents(validItems),
              customerId: shipment.partyId,
              customerName: `${shipment.firstName || ''} ${shipment.lastName || ''}`.trim(),
              pickers: pickersInfo.pickers,
              pickerIds: pickersInfo.pickerIds
            };
          }).filter((order: any) => order !== null);

          await productStore.fetchProducts({ productIds });

          const completedOrders = await OrderService.fetchGiftCardActivationDetails({
            isDetailsPage: false,
            currentOrders: orders
          });

          orders = params.viewIndex && params.viewIndex > 0 ? this.completed.list.concat(completedOrders) : completedOrders;
          this.completed = { list: orders, total };
          if (params.viewIndex === 0) emitter.emit("dismissLoader");
        } else {
          this.completed = { list: [], total: 0 };
        }

        emitter.emit("dismissLoader");
        return resp;
      } catch (err) {
        logger.error(err);
        commonUtil.showToast(translate("Something went wrong"));
        emitter.emit("dismissLoader");
      }
    },
    async getCommunicationEvents(params: any) {
      try {
        const completedOrdersList = params.orders.map((completedOrderData: any) => completedOrderData.orderId);
        const orderCommunicationEvents = this.communicationEvents;

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
          this.communicationEvents = mergedOrdersList;
          return resp.data.communicationEventList;
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error(err);
      }
    },
    async deliverShipment(order: any) {
      emitter.emit("presentLoader");
      const params = { shipmentId: order.shipmentId };
      let resp;
      try {
        resp = await OrderService.shipOrder(params)
        if (!hasError(resp)) {
          const orderIndex = this.packed.list.findIndex((packedOrder: any) => {
            return packedOrder.orderId === order.orderId && order.primaryShipGroupSeqId === packedOrder.primaryShipGroupSeqId;
          });
          if (orderIndex > -1) {
            this.packed.list.splice(orderIndex, 1);
            this.packed.total -= 1;
          }

          if (order.shipmentMethodTypeId === 'STOREPICKUP') {
            order = { ...order, handovered: true }
          } else {
            order = { ...order, shipped: true }
          }
          this.updateCurrent({ order })
        } else {
          commonUtil.showToast(translate("Something went wrong"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
      return resp;
    },
    async deliverShipmentFromDetail(order: any) {
      emitter.emit("presentLoader");
      const params = { shipmentId: order.shipGroup.shipmentId };
      let resp;
      try {
        resp = await OrderService.shipOrder(params)
        if (!hasError(resp)) {
          if (this.packed.list.length) {
            const orderIndex = this.packed.list.findIndex((packedOrder: any) => {
              return packedOrder.orderId === order.orderId && order.shipGroup.shipGroupSeqId === packedOrder.primaryShipGroupSeqId;
            });
            if (orderIndex > -1) {
              this.packed.list.splice(orderIndex, 1);
              this.packed.total -= 1;
            }
          }

          if (order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP') {
            order = { ...order, handovered: true }
          } else {
            order = { ...order, shipped: true }
          }
          this.updateCurrent({ order })
        } else {
          commonUtil.showToast(translate("Something went wrong"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      }
      emitter.emit("dismissLoader")
      return resp;
    },
    async packShipGroupItems(payload: any) {
      const params = {
        orderId: payload.order.orderId,
        facilityId: payload.shipGroup.facilityId,
        shipmentId: payload.shipGroup.shipmentId
      }
      let resp;
      try {
        resp = await OrderService.packOrder(params)
        if (resp.status === 200 && !hasError(resp)) {
          this.removeOpenOrder(payload)
          if (payload.order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP') {
            payload.order = { ...payload.order, readyToHandover: true }
          } else {
            payload.order = { ...payload.order, readyToShip: true }
          }
          this.updateCurrent({ order: payload.order })
          commonUtil.showToast(translate("Order packed and ready for delivery"))
        } else {
          commonUtil.showToast(translate("Something went wrong"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      } finally {
        emitter.emit("dismissLoader")
      }
      return resp;
    },
    removeOpenOrder(payload: any) {
      const orders = JSON.parse(JSON.stringify(this.open.list));
      const orderIndex = orders?.findIndex((order: any) => {
        return order.orderId === payload.order.orderId && order.shipGroups.some((shipGroup: any) => {
          return shipGroup.shipGroupSeqId === payload.shipGroup.shipGroupSeqId;
        });
      });
      if (orderIndex > -1) {
        orders.splice(orderIndex, 1);
        this.open = { list: orders, total: this.open.total - 1 };
      }
    },
    async rejectItems(payload: any) {
      emitter.emit("presentLoader");
      try {
        const resp = await this.rejectOrderItems(payload);
        const refreshPickupOrders = resp.find((response: any) => response.data);
        if (refreshPickupOrders) {
          commonUtil.showToast(translate(payload.isEntireOrderRejected ? 'All items were rejected from the order' : 'Some items were rejected from the order') + ' ' + (payload.orderName ? payload.orderName : payload.orderId));
        } else {
          commonUtil.showToast(translate('Something went wrong'));
        }
        return resp;
      } catch (err) {
        return err;
      } finally {
        emitter.emit("dismissLoader");
      }
    },
    async rejectOrderItems(order: any) {
      const itemsToReject = order.shipGroup.items
        .map((item: any) => ({
          ...item,
          updateQOH: false,
          rejectionReasonId: item.reason,
          kitComponents: orderUtil.isKit(item) ? item.rejectedComponents || [] : []
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
        return err as any
      }
    },
    async getShipToStoreIncomingOrders(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader")
      let resp: any
      const params = {
        orderFacilityId: commonUtil.getCurrentFacilityId(),
        orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
        statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
        shipmentMethodTypeId: 'SHIP_TO_STORE',
        shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
        pageSize: payload.viewSize || process.env.VUE_APP_VIEW_SIZE,
        pageIndex: payload.viewIndex || 0
      } as any
      if (payload.queryString?.trim()?.length) {
        params.keyword = payload.queryString.trim();
      }
      let incomingOrders = [] as any
      try {
        resp = await OrderService.getShipToStoreOrders(params)
        if (!hasError(resp)) {
          const ordersResp = resp.data.orders;
          const orderCount = this.shipToStore.incoming.orderCount + resp.data.orders.length;
          incomingOrders = ordersResp.flatMap((order: any) => {
            const shipGroups = order.shipGroups || [];
            return shipGroups.map((shipGroup: any) => ({
              customerName: order.customerName,
              orderDate: order.orderDate,
              orderId: order.orderId,
              orderName: order.orderName,
              ...shipGroup
            }))
          })

          let productIds: any = new Set();
          incomingOrders.map((order: any) => {
            order.items.map((item: any) => productIds.add(item.productId))
            return productIds
          });
          productIds = [...productIds]
          const productStore = useProductStore();
          await productStore.fetchProducts({ productIds })

          const total = resp.data.ordersCount;
          if (payload.viewIndex && payload.viewIndex > 0) {
            incomingOrders = this.shipToStore.incoming.list.concat(incomingOrders);
          }
          this.shipToStore.incoming = { list: incomingOrders, total, orderCount };
        } else {
          this.shipToStore.incoming = { list: [], total: 0, orderCount: 0 };
          commonUtil.showToast(translate("Orders Not Found"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      } finally {
        emitter.emit("dismissLoader")
      }
      return resp;
    },
    async getShipToStoreReadyForPickupOrders(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader")
      let resp: any
      const params = {
        shipmentStatusId: "SHIPMENT_ARRIVED",
        shipmentMethodTypeId: "SHIP_TO_STORE",
        orderFacilityId: commonUtil.getCurrentFacilityId(),
        statusId: "ITEM_COMPLETED",
        orderStatusId: "ORDER_COMPLETED",
        pageSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
        pageIndex: payload.viewIndex ? payload.viewIndex : 0
      } as any
      if (payload.queryString?.trim()?.length) {
        params.keyword = payload.queryString.trim();
      }
      let readyForPickupOrders = [] as any
      try {
        resp = await OrderService.getShipToStoreOrders(params)
        if (!hasError(resp)) {
          const ordersResp = resp.data.orders;
          const orderCount = this.shipToStore.readyForPickup.orderCount + resp.data.orders.length;
          readyForPickupOrders = ordersResp.flatMap((order: any) => {
            const shipGroups = order.shipGroups || [];
            return shipGroups.filter((shipGroup: any) => shipGroup.shipmentId != null).map((shipGroup: any) => ({
              customerName: order.customerName,
              createdDate: order.orderDate,
              orderId: order.orderId,
              orderName: order.orderName,
              ...shipGroup
            }))
          })

          let productIds: any = new Set();
          readyForPickupOrders.map((order: any) => {
            order.items.map((item: any) => productIds.add(item.productId))
            return productIds
          });
          productIds = [...productIds]
          const productStore = useProductStore();
          await productStore.fetchProducts({ productIds })

          const total = resp.data.ordersCount;
          if (payload.viewIndex && payload.viewIndex > 0) {
            readyForPickupOrders = this.shipToStore.readyForPickup.list.concat(readyForPickupOrders)
          }
          this.shipToStore.readyForPickup = { list: readyForPickupOrders, total, orderCount };
        } else {
          this.shipToStore.readyForPickup = { list: [], total: 0, orderCount: 0 };
          commonUtil.showToast(translate("Orders Not Found"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      } finally {
        emitter.emit("dismissLoader")
      }
      return resp;
    },
    async getShipToStoreCompletedOrders(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader")
      let resp: any
      const params = {
        shipmentStatusId: "SHIPMENT_DELIVERED",
        shipmentMethodTypeId: "SHIP_TO_STORE",
        statusId: "ITEM_COMPLETED",
        orderStatusId: "ORDER_COMPLETED",
        orderFacilityId: commonUtil.getCurrentFacilityId(),
        pageSize: payload.viewSize ? payload.viewSize : process.env.VUE_APP_VIEW_SIZE,
        pageIndex: payload.viewIndex ? payload.viewIndex : 0
      } as any
      if (payload.queryString?.trim()?.length) {
        params.keyword = payload.queryString.trim();
      }
      let completedOrders = [] as any
      try {
        resp = await OrderService.getShipToStoreOrders(params)
        if (!hasError(resp)) {
          const ordersResp = resp.data.orders;
          const orderCount = this.shipToStore.completed.orderCount + resp.data.orders.length;
          completedOrders = ordersResp.flatMap((order: any) => {
            const shipGroups = order.shipGroups || [];
            return shipGroups.map((shipGroup: any) => ({
              customerName: order.customerName,
              createdDate: order.orderDate,
              orderId: order.orderId,
              orderName: order.orderName,
              ...shipGroup
            }))
          })

          let productIds: any = new Set();
          completedOrders.map((order: any) => {
            order.items.map((item: any) => productIds.add(item.productId))
            return productIds
          });
          productIds = [...productIds]
          const productStore = useProductStore();
          await productStore.fetchProducts({ productIds })

          const total = resp.data.ordersCount;
          if (payload.viewIndex && payload.viewIndex > 0) {
            completedOrders = this.shipToStore.completed.list.concat(completedOrders)
          }
          this.shipToStore.completed = { list: completedOrders, total, orderCount };
        } else {
          this.shipToStore.completed = { list: [], total: 0, orderCount: 0 };
          commonUtil.showToast(translate("Orders Not Found"))
        }
      } catch (err) {
        logger.error(err)
        commonUtil.showToast(translate("Something went wrong"))
      } finally {
        emitter.emit("dismissLoader")
      }
      return resp;
    },
    async getOrderItemRejectionHistory(payload: any) {
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
          const productIds = [...(resp.data.docs.reduce((ids: any, history: any) => ids.add(history.productId), new Set()))];
          const productStore = useProductStore();
          await productStore.fetchProducts({ productIds })
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch order item rejection history', err)
      }
      this.orderItemRejectionHistory = rejectionHistory;
      emitter.emit("dismissLoader");
    },
    updateOpenOrder(payload: any) {
      this.open = { list: payload.orders, total: payload.total };
    },
    clearOrders() {
      this.open = { list: [], total: 0 };
      this.packed = { list: [], total: 0 };
      this.completed = { list: [], total: 0 };
      this.current = {};
    },
    async updateCurrentItemGCActivationDetails({ item, orderId, orderType, isDetailsPage }: { item: any, orderId: any, orderType: string, isDetailsPage: boolean }) {
      let gcInfo = {};
      let isGCActivated = false;
      try {
        const resp = await UtilService.fetchGiftCardFulfillmentInfo({
          orderId: orderId,
          orderItemSeqId: item.orderItemSeqId
        })
        if (!hasError(resp)) {
          isGCActivated = true;
          gcInfo = resp.data[0];
        } else {
          throw resp.data
        }
      } catch (error) {
        logger.error(error)
      }

      if (!isGCActivated) return;

      if (isDetailsPage) {
        const order = JSON.parse(JSON.stringify(this.current));
        order.shipGroup.items?.map((currentItem: any) => {
          if (currentItem.orderId === orderId && currentItem.orderItemSeqId === item.orderItemSeqId) {
            currentItem.isGCActivated = true;
            currentItem.gcInfo = gcInfo
          }
        })
        this.current = order;
        return;
      }

      const orders = orderType === "packed" ? JSON.parse(JSON.stringify(this.packed.list)) : JSON.parse(JSON.stringify(this.completed.list));
      orders.map((order: any) => {
        if (order.orderId === orderId) {
          order.items.map((currentItem: any) => {
            if (currentItem.orderItemSeqId === item.orderItemSeqId) {
              currentItem.isGCActivated = true;
              currentItem.gcInfo = gcInfo;
            }
          })
        }
      })
      if (orderType === "packed") {
        this.packed = { list: orders, total: this.packed.total };
      } else {
        this.completed = { list: orders, total: this.completed.total };
      }
    },
    resetShipToStoreOrdersPagination() {
      this.shipToStore.incoming = { list: [], total: 0, orderCount: 0 };
      this.shipToStore.readyForPickup = { list: [], total: 0, orderCount: 0 };
      this.shipToStore.completed = { list: [], total: 0, orderCount: 0 };
    }
  }
})
