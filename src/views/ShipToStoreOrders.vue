<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Ship to Store") }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="queryString = $event.target.value; searchOrders()" :placeholder= "translate('Search')" />
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button value="incoming">
            <ion-label>{{ translate("Incoming") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="readyForPickup">
            <ion-label>{{ translate("Ready for pickup") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ translate("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>    
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <div v-if="segmentSelected === 'incoming' && incomingOrders.length">
        <div v-for="(order, index) in incomingOrders" :key="index" v-show="order.items.length">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.orderDate">{{ getDateTime(order.orderDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />

            <div class="border-top">
              <ion-button :disabled="!useUserStore().hasPermission('')|| order.shipmentStatusId!='SHIPMENT_SHIPPED'" fill="clear" @click.stop="confirmScheduleOrderForPickup(order)">
                {{ translate("Arrived") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-else-if="segmentSelected === 'readyForPickup' && readyForPickupOrders.length">
        <div v-for="(order, index) in readyForPickupOrders" :key="index" v-show="order.items.length">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.createdDate">{{ getDateTime(order.createdDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />

            <div class="border-top">
              <ion-button :disabled="!useUserStore().hasPermission('')" fill="clear" @click.stop="confirmHandoverOrder(order)">
                {{ translate("Handover") }}
              </ion-button>
              <ion-button fill="clear" slot="end" @click="sendReadyForPickupEmail(order)">
                <ion-icon slot="icon-only" :icon="mailOutline" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <div v-else-if="segmentSelected === 'completed' && completedOrders.length">
        <div v-for="(order, index) in completedOrders" :key="index" v-show="order.items.length">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customerName }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.createdDate">{{ getDateTime(order.createdDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />
          
            <div class="border-top">
              <ion-button data-testid="proof-of-delivery-button" fill="clear" v-if="isHandoverProofEnabled" @click.stop="openProofOfDeliveryModal(order, communicationEventOrderIds.has(order.orderId))">
                {{ communicationEventOrderIds.has(order.orderId) ? translate('View Proof of Delivery') : translate('Proof of Delivery') }}
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
      <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" 
        v-show="(segmentSelected === 'incoming' ? isIncomingOrdersScrollable : segmentSelected === 'readyForPickup' ? isReadyForPickupOrdersScrollable : isCompletedOrdersScrollable)"
        ref="infiniteScrollRef">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, IonBackButton, IonButton, IonCard, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonNote, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { onMounted, onUnmounted, ref, computed } from "vue";
import ProductListItem from '@/components/ProductListItem.vue'
import { mailOutline } from "ionicons/icons";
import { useOrderStore } from '@/store/order';
import { useUserStore } from '@/store/user';
import { useProductStore } from '@/store/productStore'
import { commonUtil, emitter, logger, translate } from "@common"

import { DateTime } from 'luxon';
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal.vue";

const orderStore = useOrderStore();
const queryString = ref('');
const isScrollingEnabled = ref(false);
const segmentSelected = ref('incoming');
const contentRef = ref(null as any);
const infiniteScrollRef = ref(null as any);

const incomingOrders = computed(() => useOrderStore().getShipToStoreIncomingOrders);
const readyForPickupOrders = computed(() => useOrderStore().getShipToStoreReadyForPickupOrders);
const completedOrders = computed(() => useOrderStore().getShipToStoreCompletedOrders);
const isIncomingOrdersScrollable = computed(() => useOrderStore().isShipToStoreIncmngOrdrsScrlbl);
const isReadyForPickupOrdersScrollable = computed(() => useOrderStore().isShipToStoreRdyForPckupOrdrsScrlbl);
const isCompletedOrdersScrollable = computed(() => useOrderStore().isShipToStoreCmpltdOrdrsScrlbl);
const incomingOrderCount = computed(() => useOrderStore().getIncomingOrdersCount);
const readyForPickupOrderCount = computed(() => useOrderStore().getReadyForPickupOrdersCount);
const completedOrderCount = computed(() => useOrderStore().getCompletedOrdersCount);
const communicationEvents = computed(() => useOrderStore().getCommunicationEvents);
const isHandoverProofEnabled = computed(() => useProductStore().isHandoverProofEnabled);

const communicationEventOrderIds = computed(() => new Set((communicationEvents.value || []).map((e: any) => e.orderId)));

const getDateTime = (time: any) => {
  return DateTime.fromMillis(time).toLocaleString();
};

const getIncomingOrders = async (vSize?: any, vIndex?: any) => {
  const viewSize = vSize ? vSize : (import.meta.env.VITE_VIEW_SIZE as any);
  const viewIndex = vIndex ? vIndex : 0;
  await (useOrderStore() as any).getShipToStoreIncomingOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (useProductStore().getCurrentFacility as any)?.facilityId });
};

const getReadyForPickupOrders = async (vSize?: any, vIndex?: any) => {
  const viewSize = vSize ? vSize : (import.meta.env.VITE_VIEW_SIZE as any);
  const viewIndex = vIndex ? vIndex : 0;
  await (useOrderStore() as any).getReadyForPickupOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (useProductStore().getCurrentFacility as any)?.facilityId });
};

const getCompletedOrders = async (vSize?: any, vIndex?: any) => {
  const viewSize = vSize ? vSize : (import.meta.env.VITE_VIEW_SIZE as any);
  const viewIndex = vIndex ? vIndex : 0;
  await (useOrderStore() as any).getShipToStoreCompletedOrders({ viewSize, viewIndex, queryString: queryString.value, facilityId: (useProductStore().getCurrentFacility as any)?.facilityId });
  await (useOrderStore() as any).getCommunicationEvents({ orders: completedOrders.value });
};

const refreshOrders = async (event: any) => {
  if(segmentSelected.value === 'incoming') {
    await getIncomingOrders();
  } else if (segmentSelected.value === 'readyForPickup') {
    await getReadyForPickupOrders();
  } else {
    await getCompletedOrders();
  }
  event.target.complete();
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  if (!parentElement) return;
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']");
  if (!scrollEl) return;
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
};

const loadMoreOrders = async (event: any) => {
  const isScrollable = segmentSelected.value === 'incoming' ? isIncomingOrdersScrollable.value : segmentSelected.value === 'readyForPickup' ? isReadyForPickupOrdersScrollable.value : isCompletedOrdersScrollable.value;
  if (!(isScrollingEnabled.value && isScrollable)) {
    await event.target.complete();
  }

  const viewSize = (import.meta.env.VITE_VIEW_SIZE as any);
  if (segmentSelected.value === 'incoming') {
    await getIncomingOrders(undefined, Math.ceil(incomingOrderCount.value / viewSize).toString());
  } else if (segmentSelected.value === 'readyForPickup') {
    await getReadyForPickupOrders(undefined, Math.ceil(readyForPickupOrderCount.value / viewSize).toString());
  } else {
    await getCompletedOrders(undefined, Math.ceil(completedOrderCount.value / viewSize).toString());
  }
  await event.target.complete();
};

const segmentChanged = (event: CustomEvent) => {
  queryString.value = '';
  segmentSelected.value = event.detail.value;
  useOrderStore().resetShipToStoreOrdersPagination();
  if(segmentSelected.value === 'incoming') {
    getIncomingOrders();
  } else if(segmentSelected.value === 'readyForPickup') {
    getReadyForPickupOrders();
  } else {
    getCompletedOrders();
  }
};

const searchOrders = async () => {
  queryString.value = queryString.value.trim();
  useOrderStore().resetShipToStoreOrdersPagination();
  if(segmentSelected.value === 'incoming') {
    await getIncomingOrders();
  } else if(segmentSelected.value === 'readyForPickup') {
    await getReadyForPickupOrders();
  } else {
    await getCompletedOrders();
  }
};

const selectSearchBarText = (event: any) => {
  event.target.getInputElement().then((element: any) => {
    element.select();
  });
};

const scheduleOrderForPickup = async (shipmentId: string, order: any) => {
  emitter.emit("presentLoader");
  try {
    const resp = await orderStore.arrivedShipToStore(shipmentId);
    if (!commonUtil.hasError(resp)) {
      const orderId = order.orderId;
      const incomingParams = {
        orderId,
        orderFacilityId: (useProductStore().getCurrentFacility as any)?.facilityId,
        pageSize: 10,
        orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
        statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
        shipmentMethodTypeId: 'SHIP_TO_STORE',
        shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
      };
      const incomingResp = await orderStore.getShipToStoreOrdersMeta(incomingParams);
      const isLastShipGroup = !commonUtil.hasError(incomingResp) && incomingResp.data.ordersCount === 0;
      if (isLastShipGroup) {
        try {
          const emailResp = await orderStore.sendPickupScheduledNotification({ shipmentId });
          if (!commonUtil.hasError(emailResp)) {
            commonUtil.showToast(translate('Order marked as ready for pickup, an email notification has been sent to the customer'));
          }
        } catch (error) {
          logger.error('Error sending pickup scheduled notification:', error);
          commonUtil.showToast(translate('Order marked as ready for pickup but something went wrong while sending the email notification'));
        }
      } else {
        commonUtil.showToast(translate('Order marked as ready for pickup'));
      }
      useOrderStore().resetShipToStoreOrdersPagination();
      await getIncomingOrders();
    } else {
      commonUtil.showToast(translate("Failed to mark order as ready for pickup"));
    }
  } catch (err) {
    logger.error('Schedule order for pickup error:', err);
    commonUtil.showToast(translate("Something went wrong"));
  } finally {
    emitter.emit("dismissLoader");
  }
};

const confirmScheduleOrderForPickup = async (order: any) => {
  const alert = await alertController.create({
    header: translate('Ready for pickup'),
    message: translate('Order will be marked as ready for pickup and an email notification will be sent to . This action is irreversible.',{  customerName: order.customerName }),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel'
    },{
      text: translate('Ready for pickup'),
      handler: () => scheduleOrderForPickup(order.shipmentId, order)
    }]
  });
  return alert.present();
};

const handoverOrder = async (shipmentId: string, order: any) => {
  emitter.emit("presentLoader");
  try{
    const resp = await orderStore.handoverShipToStoreOrder(shipmentId);
    if(!commonUtil.hasError(resp)) {
      const orderId = order.orderId;
      const checkShipGroupParams = {
        orderId,
        orderFacilityId: (useProductStore().getCurrentFacility as any)?.facilityId,
        pageSize: 10
      };
      const pendingShipGroupParams = {
        ...checkShipGroupParams,
        orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
        statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
        shipmentMethodTypeId: 'SHIP_TO_STORE',
        shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED,SHIPMENT_ARRIVED',
      };
      const shipGroupResp = await orderStore.getShipToStoreOrdersMeta(pendingShipGroupParams);
      const isLastShipGroup = !commonUtil.hasError(shipGroupResp) && shipGroupResp.data.ordersCount === 0;
      if (isLastShipGroup) {
        try {
          const emailResp = await orderStore.sendHandoverNotification({ shipmentId });
          if (!commonUtil.hasError(emailResp)) {
            commonUtil.showToast(translate('Order handed over successfully and order completion email has been sent'));
          } else {
            logger.error('Error sending handover notification:', emailResp);
            commonUtil.showToast(translate('Order handed over successfully but something went wrong while sending the email notification'));
          }
        } catch (error) {
          logger.error('Error sending handover notification:', error);
          commonUtil.showToast(translate('Order handed over successfully but something went wrong while sending the email notification'));
        }
      } else {
        commonUtil.showToast(translate('Order handed over successfully'));
      }
      await getReadyForPickupOrders();
    } else {
      commonUtil.showToast(translate("Failed to handover order"));
      logger.error("Handover failed", resp);
    }
  } catch (err) {
    logger.error('Handover failed', err);
    commonUtil.showToast(translate("Something went wrong"));
  } finally {
    emitter.emit("dismissLoader");
  }
};

const confirmHandoverOrder = async (order: any) => {
  const alert = await alertController.create({
    header: translate('Complete order'),
    message: translate('Order will be marked as completed and an email notification will be sent to the customer. This action is irreversible.'),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel'
    },{
      text: translate('Complete'),
      handler: () => handoverOrder(order.shipmentId, order)
    }]
  });
  return alert.present();
};

const sendReadyForPickupEmail = async (order: any) => {
  const alert = await alertController.create({
    header: translate('Resend email'),
    message: translate('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customerName }),
    buttons: [{
      text: translate('Cancel'),
      role: 'cancel'
    }, {
      text: translate('Send'),
      handler: async () => {
        try {
          const resp = await orderStore.sendPickupScheduledNotification({ shipmentId: order.shipmentId });
          if (!commonUtil.hasError(resp)) {
            commonUtil.showToast(translate("Email sent successfully"));
          } else {
            commonUtil.showToast(translate("Something went wrong while sending the email."));
          }
        } catch (error) {
          commonUtil.showToast(translate("Something went wrong while sending the email."));
          logger.error(error);
        }
      }
    }]
  });
  return alert.present();
};

const openProofOfDeliveryModal = async (order: any, isViewModeOnly: any) => {
  const modal = await modalController.create({
    component: ProofOfDeliveryModal,
    componentProps: {
      order,
      isViewModeOnly
    },
  });
  await modal.present();
  const { data } = await modal.onDidDismiss();
  if (data?.confirmed && data?.proofOfDeliveryData) {
    emitter.emit("presentLoader");
    try {
      const resp = await orderStore.sendPickupNotification(data.proofOfDeliveryData);
      if (commonUtil.hasError(resp)) {
        logger.error("Pickup notification failed:", resp);
        commonUtil.showToast(translate("Unable to save the details. Please try again."));
      } else {
        await (useOrderStore() as any).getCommunicationEvents({ orders: [order] });
        commonUtil.showToast(translate("Details have been successfully saved, and an email has been sent to the customer."));
      }
    } catch (err) {
      logger.error("Error in saving the details:", err);
      commonUtil.showToast(translate("Something went wrong"));
    } finally {
      emitter.emit("dismissLoader");
    }
  }
};

onMounted(() => {
  emitter.on("refreshPickupOrders", getIncomingOrders);
});

onUnmounted(() => {
  emitter.off("refreshPickupOrders", getIncomingOrders);
});

</script>

<style scoped>

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
  grid-auto-columns: max-content 1fr;
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
