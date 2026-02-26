<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ (currentFacility as any)?.facilityName ? (currentFacility as any)?.facilityName : (currentFacility as any)?.facilityId }}</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="notifications-button" @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button @click="viewShipToStoreOrders()">
            <ion-icon slot="icon-only" :icon="trailSignOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <div>
        <ion-searchbar data-testid="order-searchbar" @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="queryString = $event.target.value; searchOrders()" :placeholder="translate('Search Orders')" />
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button data-testid="open-segment-button" value="open">
            <ion-label>{{ translate("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="packed-segment-button" value="packed">
            <ion-label>{{ translate("Packed") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button data-testid="completed-segment-button" value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>    
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <div data-testid="open-orders-container" v-if="segmentSelected === 'open' && orders.length">

        <div v-for="(order, index) in getOrdersByPart(orders)" :key="index" v-show="order.shipGroups.length > 0">
          <ion-card data-testid="order-card" button @click.prevent="viewOrder(order, order.shipGroup.shipGroupSeqId, 'open')">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p data-testid="order-name-tag">{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-badge v-if="order.orderDate" color="dark">{{ timeFromNowInMillis(order.orderDate) }}</ion-badge>
                <ion-badge v-if="order.orderStatusId !== 'ORDER_APPROVED'" color="danger">{{ translate('pending approval') }}</ion-badge>
              </div>
              <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
            </ion-item>

            <ion-item v-if="order.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ translate("Handling Instructions") }}</p>
                <p>{{ order.shippingInstructions }}</p>
              </ion-label>
            </ion-item>

            <ProductListItem v-for="item in order.shipGroup.items" :key="item.productId" :item="item" />
                        
            <div class="border-top">
              <ion-button :data-testid="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? 'ready-pickup-button' : 'ready-ship-button'" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="readyForPickup(order, order.shipGroup)">
                {{ order.shipGroup?.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
              </ion-button>
              <div></div>
              <ion-button data-testid="listpage-reject-button" v-if="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' && !getBopisProductStoreSettings('REQUEST_TRANSFER')" color="danger" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="openRejectOrderModal(order)">
                {{ translate("Reject") }}
              </ion-button>
              <ion-button data-testid="listpage-request-transfer-button" v-if="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' && getBopisProductStoreSettings('REQUEST_TRANSFER')" color="warning" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="confirmRequestTransfer(order)">
                {{ translate("Request Transfer") }}
              </ion-button>
              <ion-button size="default" v-if="getBopisProductStoreSettings('PRINT_PICKLISTS')" slot="end" fill="clear" @click.stop="printPicklist(order, order.shipGroup)">
                  <ion-icon :icon="printOutline" slot="icon-only" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>       
      <div data-testid="packed-orders-container" v-else-if="segmentSelected === 'packed' && packedOrders.length">
        <div v-for="(order, index) in packedOrders" :key="index" v-show="order.items.length > 0">
          <ion-card data-testid="order-card" button @click.prevent="viewOrder(order, order.primaryShipGroupSeqId, 'packed')">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p data-testid="order-name-tag">{{ order.orderName ? order.orderName : order.orderId }}</p>
                <p v-if="getBopisProductStoreSettings('ENABLE_TRACKING')">{{ order.pickers ? translate("Picked by", { pickers: order.pickers }) : translate("No picker assigned.") }}</p>
              </ion-label>
              <ion-badge v-if="order.orderDate" color="dark" slot="end">{{ timeFromNowInMillis(order.orderDate) }}</ion-badge>
            </ion-item>

            <ion-item v-if="order.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ translate("Handling Instructions") }}</p>
                <p>{{ order.shippingInstructions }}</p>
              </ion-label>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :orderId="order.orderId" :customerId="order.customerId" :currencyUom="order.currencyUom" orderType="packed"/>
            <div class="border-top">

              <ion-button data-testid="handover-button" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="deliverShipment(order)">
                {{ order.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
              </ion-button>
              <ion-button size="default" data-testid="packing-slip-button" v-if="getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" fill="clear" slot="end" @click.stop="printPackingSlip(order)">
                <ion-icon slot="icon-only" :icon="printOutline" />
              </ion-button>

              <ion-button size="default" data-testid="resend-email-button" v-if="order.shipmentMethodTypeId === 'STOREPICKUP'" fill="clear" slot="end" @click.stop="sendReadyForPickupEmail(order)">
                <ion-icon slot="icon-only" :icon="mailOutline" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <div data-testid="completed-orders-container" v-else-if="segmentSelected === 'completed' && completedOrders.length">
        <div v-for="(order, index) in completedOrders" :key="index" v-show="order.items.length > 0">
          <ion-card data-testid="order-card" button @click.prevent="viewOrder(order, order.primaryShipGroupSeqId, 'completed')">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p data-testid="order-name-tag">{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <ion-badge v-if="order.orderDate" color="dark" slot="end">{{ timeFromNowInMillis(order.orderDate) }}</ion-badge>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :orderId="order.orderId" :customerId="order.customerId" :currencyUom="order.currencyUom" orderType="completed"/>          
            <div class="border-top">
              <ion-button data-testid="proof-of-delivery-button" fill="clear" v-if="getBopisProductStoreSettings('HANDOVER_PROOF')" @click.stop="openProofOfDeliveryModal(order, communicationEventOrderIds.has(order.orderId))">
                {{ communicationEventOrderIds.has(order.orderId) ? translate('View Proof of Delivery') : translate('Proof of Delivery') }}
              </ion-button>
              <div></div>
              <ion-button  size="default" data-testid="packing-slip-button" v-if="getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" fill="clear" slot="end" @click.stop="printPackingSlip(order)">
                <ion-icon slot="icon-only" :icon="printOutline" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <template v-else>
        <p class="empty-state">{{translate('No orders found')}}</p>
      </template>
      <ion-refresher slot="fixed" @ionRefresh="refreshOrders($event)">
        <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
      </ion-refresher>
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" 
        v-show="(segmentSelected === 'open' ? isOpenOrdersScrollable : segmentSelected === 'packed' ? isPackedOrdersScrollable : isCompletedOrdersScrollable)"
        ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, IonBadge, IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { onMounted, onUnmounted, ref, computed } from "vue";
import ProductListItem from '@/components/ProductListItem.vue'
import { mailOutline, notificationsOutline, printOutline, trailSignOutline } from "ionicons/icons";
import { useRouter } from 'vue-router'
import { commonUtil } from '@/utils/commonUtil'
import { DateTime } from 'luxon';
import emitter from "@/event-bus"
import { hasError } from '@/adapter';
import { translate } from "@hotwax/dxp-components";
import AssignPickerModal from "./AssignPickerModal.vue";
import { OrderService } from "@/services/OrderService";
import { UserService } from "@/services/UserService";
import { Actions, hasPermission } from '@/authorization'
import logger from "@/logger";
import RejectOrderItemModal from "@/components/RejectOrderItemModal.vue";
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal.vue";
import { useUserStore } from "@/store/user";
import { useOrderStore } from "@/store/order";

const router = useRouter();

const queryString = ref('');
const isScrollingEnabled = ref(false);
const segmentSelected = ref('open');
const contentRef = ref(null as any);
const infiniteScrollRef = ref(null as any);

const orders = computed(() => useOrderStore().getOpenOrders);
const packedOrders = computed(() => useOrderStore().getPackedOrders);
const completedOrders = computed(() => useOrderStore().getCompletedOrders);
const isPackedOrdersScrollable = computed(() => useOrderStore().isPackedOrdersScrollable);
const isOpenOrdersScrollable = computed(() => useOrderStore().isOpenOrdersScrollable);
const isCompletedOrdersScrollable = computed(() => useOrderStore().isCompletedOrdersScrollable);
const notifications = computed(() => useUserStore().getNotifications);
const unreadNotificationsStatus = computed(() => useUserStore().hasUnreadNotifications);
const getBopisProductStoreSettings = (property: string) => (useUserStore().getBopisProductStoreSettings as any)(property);
const order = computed(() => useOrderStore().current);
const communicationEvents = computed(() => useOrderStore().getCommunicationEvents);
const currentFacility = computed(() => useUserStore().getCurrentFacility);

const communicationEventOrderIds = computed(() => {
  return new Set((communicationEvents.value || []).map((e: any) => e.orderId));
});

onMounted(() => {
  emitter.on("refreshPickupOrders", getPickupOrders);
});

onUnmounted(() => {
  emitter.off("refreshPickupOrders", getPickupOrders);
});

onIonViewWillEnter(() => {
  isScrollingEnabled.value = false;
  queryString.value = '';

  segmentSelected.value = order.value?.orderType || "open"

  if (segmentSelected.value === 'open') {
    getPickupOrders()
  } else if (segmentSelected.value === 'packed') {
    getPackedOrders()
  } else {
    getCompletedOrders()
  }
});

async function assignPicker(order: any, shipGroup: any, facilityId: any) {
  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { order, shipGroup, facilityId }
  });
  assignPickerModal.onDidDismiss().then(async (result: any) => {
    if (result.data?.selectedPicker) {
      emitter.emit("presentLoader");
      await createPicklist(order, result.data.selectedPicker);
      const updatedOrder = orders.value.find((ord: any) => ord.orderId === order.orderId);
      const updatedShipGroup = updatedOrder.shipGroups.find((sg: any) => sg.shipGroupSeqId === shipGroup.shipGroupSeqId);
      await useOrderStore().packShipGroupItems({ order: updatedOrder, shipGroup: updatedShipGroup })
      emitter.emit("dismissLoader");
    }
  })

  return assignPickerModal.present();
}

function timeFromNowInMillis(time: any) {
  const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
  return DateTime.local().plus(timeDiff).toRelative();
}

async function printPackingSlip(order: any) {
  if (order.isGeneratingPackingSlip) {
    return;
  }

  order.isGeneratingPackingSlip = true;
  await OrderService.printPackingSlip([order.shipmentId]);
  order.isGeneratingPackingSlip = false;
}

async function refreshOrders(event: any) {
  if (segmentSelected.value === 'open') {
    getPickupOrders().then(() => { event.target.complete() });
  } else if (segmentSelected.value === 'packed') {
    getPackedOrders().then(() => { event.target.complete() });
  } else {
    getCompletedOrders().then(() => { event.target.complete() });
  }
}

async function viewOrder(orderData: any, shipGroupSeqId: any, orderType: any) {
  orderData['orderType'] = orderType
  await useOrderStore().updateCurrent({ order: orderData })
  router.push({ path: `/orderdetail/${orderType}/${orderData.orderId}/${shipGroupSeqId}` })
}

async function getPickupOrders(vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  await useOrderStore().fetchOpenOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (currentFacility.value as any)?.facilityId });
}

async function getPackedOrders(vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  await useOrderStore().fetchPackedOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (currentFacility.value as any)?.facilityId });
}

async function getCompletedOrders(vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
  const viewIndex = vIndex ? vIndex : 0;
  await useOrderStore().fetchCompletedOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (currentFacility.value as any)?.facilityId });
  if (hasPermission(Actions.APP_PROOF_OF_DELIVERY_PREF_UPDATE)) await useOrderStore().getCommunicationEvents({ orders: completedOrders.value });
}

function enableScrolling() {
  const parentElement = contentRef.value?.$el
  if(!parentElement) return;
  const scrollEl = parentElement.shadowRoot?.querySelector("div[part='scroll']")
  if(!scrollEl) return;
  
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if (distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function loadMoreProducts(event: any) {
  if (!(isScrollingEnabled.value && (segmentSelected.value === 'open' ? isOpenOrdersScrollable.value : segmentSelected.value === 'packed' ? isPackedOrdersScrollable.value : isCompletedOrdersScrollable.value))) {
    await event.target.complete();
  }
  if (segmentSelected.value === 'open') {
    getPickupOrders(
      undefined,
      Math.ceil(orders.value.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
    ).then(async () => {
      await event.target.complete();
    });
  } else if (segmentSelected.value === 'packed') {
    getPackedOrders(
      undefined,
      Math.ceil(packedOrders.value.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
    ).then(async () => {
      await event.target.complete();
    });
  } else {
    getCompletedOrders(
      undefined,
      Math.ceil(completedOrders.value.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
    ).then(async () => {
      await event.target.complete();
    });
  }
}

async function readyForPickup(orderData: any, shipGroup: any) {
  if (getBopisProductStoreSettings('ENABLE_TRACKING') && !shipGroup.picklistId) return assignPicker(orderData, shipGroup, (currentFacility.value as any)?.facilityId);
  const pickup = shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
  const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
  const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: orderData.customerName, space: '<br/><br/>' }) : '';

  const alert = await alertController
    .create({
      header: header,
      message: message,
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel'
      }, {
        text: header,
        handler: async () => {
          alert.dismiss();
          emitter.emit("presentLoader", { message: "Loading...", backdropDismiss: false });
          let orderIndex;
          if (!shipGroup.shipmentId) {
            await printPicklist(orderData, shipGroup)
            orderIndex = orders.value.findIndex((o: any) => o.orderId === orderData.orderId);
          }
          await useOrderStore().packShipGroupItems({ order: orderIndex >= 0 ? orders.value[orderIndex] : orderData, shipGroup: orderIndex >= 0 ? orders.value[orderIndex].shipGroup : shipGroup })
          emitter.emit("dismissLoader");
        }
      }]
    });
  return alert.present();
}

async function deliverShipment(orderData: any) {
  await useOrderStore().deliverShipment(orderData)
    .then((resp) => {
      if (!hasError(resp as any)) {
        commonUtil.showToast(translate('Order delivered to', { customerName: orderData.customerName }))
      }
    })
}

function segmentChanged(e: CustomEvent) {
  queryString.value = ''
  segmentSelected.value = e.detail.value

  if (segmentSelected.value === 'open') {
    getPickupOrders()
  } else if (segmentSelected.value === 'packed') {
    getPackedOrders()
  } else {
    getCompletedOrders()
  }
}

async function searchOrders() {
  if (segmentSelected.value === 'open') {
    getPickupOrders()
  } else if (segmentSelected.value === 'packed') {
    getPackedOrders()
  } else {
    getCompletedOrders()
  }
}

function selectSearchBarText(event: any) {
  event.target.getInputElement().then((element: any) => {
    element.select();
  })
}

async function sendReadyForPickupEmail(orderData: any) {
  const header = translate('Resend email')
  const message = translate('An email notification will be sent to that their order is ready for pickup.', { customerName: orderData.customerName });

  const alert = await alertController
    .create({
      header: header,
      message: message,
      buttons: [{
        text: translate('Cancel'),
        role: 'cancel'
      }, {
        text: translate('Send'),
        handler: async () => {
          try {
            const resp = await OrderService.sendPickupScheduledNotification({ shipmentId: orderData.shipmentId });
            if (!hasError(resp)) {
              commonUtil.showToast(translate("Email sent successfully"))
            } else {
              commonUtil.showToast(translate("Something went wrong while sending the email."))
            }
          } catch (error) {
            commonUtil.showToast(translate("Something went wrong while sending the email."))
            logger.error(error)
          }
        }
      }]
    });
  return alert.present();
}

function getOrdersByPart(ordersData: any) {
  return ordersData.length ? ordersData.flatMap((o: any) => o.shipGroups.map((shipGroup: any) => ({ ...o, shipGroup }))) : [];
}

function viewShipToStoreOrders() {
  router.push({ path: '/ship-to-store-orders' })
}

function viewNotifications() {
  useUserStore().setUnreadNotificationsStatus(false)
  router.push({ path: '/notifications' })
}

async function printPicklist(orderData: any, shipGroup: any) {
  if (shipGroup.picklistId) {
    await OrderService.printPicklist(shipGroup.picklistId)
    return;
  }

  if (!getBopisProductStoreSettings('ENABLE_TRACKING')) {
    try {
      const resp = await UserService.ensurePartyRole({
        partyId: "_NA_",
        roleTypeId: "WAREHOUSE_PICKER",
      })

      if (hasError(resp)) {
        throw resp.data;
      }
    } catch (error) {
      commonUtil.showToast(translate("Something went wrong. Picklist can not be created."));
      logger.error(error)
      return;
    }
    await createPicklist(orderData, "_NA_");
    return;
  }

  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { order: orderData, shipGroup, facilityId: (currentFacility.value as any).facilityId }
  });

  assignPickerModal.onDidDismiss().then(async (result: any) => {
    if (result.data?.selectedPicker) {
      createPicklist(orderData, result.data.selectedPicker)
    }
  })

  return assignPickerModal.present();
}

async function createPicklist(orderData: any, selectedPicker: any) {
  let resp: any;

  const payload = {
    packageName: "A", //default package name
    facilityId: (currentFacility.value as any)?.facilityId,
    shipmentMethodTypeId: orderData.shipGroup.shipmentMethodTypeId,
    statusId: "PICKLIST_ASSIGNED",
    pickers: selectedPicker ? [{
      partyId: selectedPicker,
      roleTypeId: "WAREHOUSE_PICKER"
    }] : [],
    orderItems: orderData.shipGroup.items.map((item: { orderId: string, orderItemSeqId: string, shipGroupSeqId: string, productId: string, quantity: number }) => ({
      orderId: item.orderId,
      orderItemSeqId: item.orderItemSeqId,
      shipGroupSeqId: item.shipGroupSeqId,
      productId: item.productId,
      quantity: item.quantity
    }))
  };

  try {
    resp = await OrderService.createPicklist(payload);
    if (!hasError(resp)) {
      // generating picklist after creating a new picklist
      await OrderService.printPicklist(resp.data.picklistId)
      const currentOrders = JSON.parse(JSON.stringify(orders.value))
      const orderIndex = currentOrders.findIndex((o: any) => o.orderId === orderData.orderId);
      let orderShipGroups = currentOrders[orderIndex].shipGroups || [];
      orderShipGroups = orderShipGroups.map((shipGroup: any) => {
        if (shipGroup.shipGroupSeqId === orderData.shipGroup.shipGroupSeqId) {
          return { ...shipGroup, picklistId: resp.data.picklistId, shipmentId: resp.data.shipmentIds?.[0] }
        }
        return shipGroup;
      });
      orderData.shipGroup = { ...orderData.shipGroup, picklistId: resp.data.picklistId, shipmentId: resp.data.shipmentIds?.[0] };

      currentOrders[orderIndex] = {
        ...currentOrders[orderIndex],
        shipGroup: orderData.shipGroup,
        shipGroups: orderShipGroups
      };

      await useOrderStore().updateOpenOrder({ orders: currentOrders, total: currentOrders.length })

    } else {
      throw resp.data;
    }
  } catch (err) {
    commonUtil.showToast(translate('Something went wrong. Picklist can not be created.'));
    emitter.emit("dismissLoader");
    return;
  }
}

async function openRejectOrderModal(orderData: any) {
  const rejectOrderModal = await modalController.create({
    component: RejectOrderItemModal,
    componentProps: {
      orderProps: orderData,
    }
  })
  return rejectOrderModal.present()
}

async function confirmRequestTransfer(orderData: any) {
  const header = translate('Convert to Ship-to-Store');
  const message = translate("The item will be sourced from another store or warehouse and shipped to this location for customer pickup. {space} You can view the order in the Ship-to-Store section by clicking the trail icon in the upper-right corner of the page. {space} Do you want to continue?", { space: '<br/><br/>' });

  const alert = await alertController.create({
    header,
    message,
    buttons: [{
      text: translate('Cancel'), role: 'cancel'
    },
    {
      text: translate('Convert'),
      handler: async () => await requestTransfer(orderData)
    }]
  });

  return alert.present();
}

async function requestTransfer(orderData: any) {
  emitter.emit("presentLoader");
  try {
    const resp = await OrderService.convertToShipToStore({
      orderId: orderData.orderId,
      shipGroupSeqId: orderData.shipGroup.shipGroupSeqId
    });
    if (!hasError(resp)) {
      commonUtil.showToast(translate('Order marked as ship to store'));
      await useOrderStore().removeOpenOrder({ order: orderData, shipGroup: orderData.shipGroup })
    } else {
      commonUtil.showToast(translate('Failed to mark order as ship to store'));
      logger.error('Ship-to-Store conversion failed', resp);
    }
  } catch (err) {
    logger.error(err);
    commonUtil.showToast(translate("Something went wrong"));
  }
  emitter.emit("dismissLoader");
}

async function openProofOfDeliveryModal(orderData: any, isViewModeOnly: any) {
  const modal = await modalController.create({
    component: ProofOfDeliveryModal,
    componentProps: {
      order: orderData,
      isViewModeOnly
    },
  });

  await modal.present();

  const { data } = await modal.onDidDismiss();

  if (data?.confirmed && data?.proofOfDeliveryData) {
    emitter.emit("presentLoader");

    try {
      // Send the proof of delivery email
      const resp = await OrderService.sendPickupNotification(data.proofOfDeliveryData);

      if (hasError(resp)) {
        logger.error("Pickup notification failed:", resp);
        commonUtil.showToast(translate("Unable to save the details. Please try again."));
      } else {
        await useOrderStore().getCommunicationEvents({ orders: [order.value] });
        commonUtil.showToast(translate("Details have been successfully saved, and an email has been sent to the customer."));
      }
    } catch (err) {
      logger.error("Error in saving the details:", err);
      commonUtil.showToast(translate("Something went wrong"));
    } finally {
      emitter.emit("dismissLoader");
    }
  }
}
</script>

<style scoped>
ion-item {
  --background: transparent;
}

@media (min-width: 343px) {
  ion-content > div {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  }
}

.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content max-content 1fr;
}

.border-top :last-child {
  justify-self: end;
}

.metadata {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  row-gap: 4px;
}

@media (min-width: 991px){
  ion-header > div {
    display: flex;
  }
}
</style>
