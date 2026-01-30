<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Shipping to store") }}</ion-title>
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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)|| order.shipmentStatusId!='SHIPMENT_SHIPPED'" fill="clear" @click.stop="confirmScheduleOrderForPickup(order)">
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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="confirmHandoverOrder(order)">
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
              <ion-button data-testid="proof-of-delivery-button" fill="clear" v-if="getBopisProductStoreSettings('HANDOVER_PROOF')" @click.stop="openProofOfDeliveryModal(order, communicationEventOrderIds.has(order.orderId))">
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

<script lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent, ref, computed } from "vue";
import ProductListItem from '@/components/ProductListItem.vue'
import { mailOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { copyToClipboard, showToast } from '@/utils'
import { hasError } from '@/adapter'
import { DateTime } from 'luxon';
import emitter from "@/event-bus"
import { Actions, hasPermission } from '@/authorization'
import { OrderService } from "@/services/OrderService";
import { translate, useUserStore } from "@hotwax/dxp-components";
import logger from "@/logger";
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal.vue";

export default defineComponent({
  name: 'ShipToStoreOrders',
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonNote,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  created () {
    emitter.on("refreshPickupOrders", this.getIncomingOrders);
  },
  unmounted () {
    emitter.off("refreshPickupOrders", this.getIncomingOrders);
  },
  computed: {
    ...mapGetters({
      incomingOrders: 'order/getShipToStoreIncomingOrders',
      readyForPickupOrders: 'order/getShipToStoreReadyForPickupOrders',
      completedOrders: 'order/getShipToStoreCompletedOrders',
      isPackedOrdersScrollable: 'order/isPackedOrdersScrollable',
      isIncomingOrdersScrollable: 'order/isShipToStoreIncmngOrdrsScrlbl',
      isReadyForPickupOrdersScrollable: 'order/isShipToStoreRdyForPckupOrdrsScrlbl',
      isCompletedOrdersScrollable: 'order/isShipToStoreCmpltdOrdrsScrlbl',
      incomingOrderCount: "order/getIncomingOrdersCount",
      readyForPickupOrderCount: "order/getReadyForPickupOrdersCount",
      completedOrderCount: "order/getCompletedOrdersCount",
      communicationEvents: 'order/getCommunicationEvents',
      getBopisProductStoreSettings: 'user/getBopisProductStoreSettings',
    })
    ,
    communicationEventOrderIds() {
      return new Set(((this as any).communicationEvents || []).map((e: any) => e.orderId));
    }
  },
  data() {
    return {
      queryString: '',
      isScrollingEnabled: false
    }
  },
  methods: {
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString();
    },
    async refreshOrders(event: any) {
      if(this.segmentSelected === 'incoming') {
        this.getIncomingOrders().then(() => { event.target.complete() });
      } else if (this.segmentSelected === 'readyForPickup') {
        this.getReadyForPickupOrders().then(() => { event.target.complete() });
      } else {
        this.getCompletedOrders().then(() => { event.target.complete() });
      }
    },
    async getIncomingOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getShipToStoreIncomingOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
    },
    async getReadyForPickupOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getShipToStoreReadyForPickupOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
    },
    async getCompletedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getShipToStoreCompletedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
      await this.store.dispatch('order/getCommunicationEvents', { orders: this.completedOrders });
    },
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreOrders (event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if (!(this.isScrollingEnabled && (this.segmentSelected === 'incoming' ? this.isIncomingOrdersScrollable : this.segmentSelected === 'readyForPickup' ? this.isReadyForPickupOrdersScrollable : this.isCompletedOrdersScrollable))) {
        await event.target.complete();
      }
      if (this.segmentSelected === 'incoming') {
        this.getIncomingOrders(
          undefined,
          Math.ceil(this.incomingOrderCount / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      } else if (this.segmentSelected === 'readyForPickup') {
        this.getReadyForPickupOrders(
          undefined,
          Math.ceil(this.readyForPickupOrderCount / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      } else {
        this.getCompletedOrders(
          undefined,
          Math.ceil(this.completedOrderCount / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      }
    },
    segmentChanged (event: CustomEvent) {
      this.queryString = ''
      this.segmentSelected = event.detail.value
      this.store.dispatch('order/resetShipToStoreOrdersPagination');
      if(this.segmentSelected === 'incoming') {
        this.getIncomingOrders()
      } else if(this.segmentSelected === 'readyForPickup') {
        this.getReadyForPickupOrders()
      } else {
        this.getCompletedOrders()
      }
    },
    async searchOrders() {
      this.queryString = this.queryString.trim()
      this.store.dispatch('order/resetShipToStoreOrdersPagination');
      if(this.segmentSelected === 'incoming') {
        this.getIncomingOrders()
      } else if(this.segmentSelected === 'readyForPickup') {
        this.getReadyForPickupOrders()
      } else {
        this.getCompletedOrders()
      }
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async confirmScheduleOrderForPickup(order: any) {
      const header = translate('Ready for pickup')
      const message = translate('Order will be marked as ready for pickup and an email notification will be sent to . This action is irreversible.',{  customerName: order.customerName });

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },{
            text: translate('Ready for pickup'),
            handler: async () => {
              await this.scheduleOrderForPickup(order.shipmentId, order)
            }
          }]
        });
      return alert.present();
    },

    async scheduleOrderForPickup(shipmentId: string, order: any) {
        emitter.emit("presentLoader");

        try {
          const resp = await OrderService.arrivedShipToStore(shipmentId);

          if (!hasError(resp)) {
            const orderId = order.orderId;

            // Check for any remaining ship groups for this order that are still incoming.
            // Directly querying the backend avoids pagination issues with the Vuex store.
            const incomingParams = {
              orderId,
              orderFacilityId: this.currentFacility?.facilityId,
              pageSize: 1,
              orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
              statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
              shipmentMethodTypeId: 'SHIP_TO_STORE',
              shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
            };

            const incomingResp = await OrderService.getShipToStoreOrders(incomingParams);
            const isLastShipGroup = !hasError(incomingResp) && incomingResp.data.ordersCount === 0;

            if (isLastShipGroup) {
              try {
                const emailResp = await OrderService.sendPickupScheduledNotification({ shipmentId });
                
                if (!hasError(emailResp)) {
                  showToast(translate('Order marked as ready for pickup, an email notification has been sent to the customer'));
                }
              } catch (error) {
                logger.error('Error sending pickup scheduled notification:', error);
                showToast(translate('Order marked as ready for pickup but something went wrong while sending the email notification'));
              }
            } else {
              showToast(translate('Order marked as ready for pickup'));
            }
            this.store.dispatch('order/resetShipToStoreOrdersPagination');
            await this.getIncomingOrders(); // Refresh after all logic
          } else {
            showToast(translate("Failed to mark order as ready for pickup"));
          }

        } catch (err) {
          logger.error('Schedule order for pickup error:', err);
          showToast(translate("Something went wrong"));
        } finally {
          emitter.emit("dismissLoader");
        }
    },
    async confirmHandoverOrder(order: any) {
      const header = translate('Complete order')
      const message = translate('Order will be marked as completed and an email notification will be sent to the customer. This action is irreversible.');

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },{
            text: translate('Complete'),
            handler: async () => {
              await this.handoverOrder(order.shipmentId, order)
            }
          }]
        });
      return alert.present();
    },
    async handoverOrder(shipmentId: string, order: any) {
      emitter.emit("presentLoader");
      
      try{
        const resp = await OrderService.handoverShipToStoreOrder(shipmentId);

        if(!hasError(resp)) {
          const orderId = order.orderId;

          // Check for any remaining ship groups for this order before sending completion email.
          // Directly querying the backend avoids pagination issues with the Vuex store.
          const checkShipGroupParams = {
            orderId,
            orderFacilityId: this.currentFacility?.facilityId,
            pageSize: 1
          };

          const incomingParams = {
            ...checkShipGroupParams,
            orderStatusId: 'ORDER_COMPLETED,ORDER_APPROVED',
            statusId: 'ITEM_COMPLETED,ITEM_APPROVED',
            shipmentMethodTypeId: 'SHIP_TO_STORE',
            shipmentStatusId: 'SHIPMENT_INPUT,SHIPMENT_APPROVED,SHIPMENT_PACKED,SHIPMENT_SHIPPED',
          };

          const readyForPickupParams = {
            ...checkShipGroupParams,
            shipmentStatusId: 'SHIPMENT_ARRIVED',
            shipmentMethodTypeId: 'SHIP_TO_STORE',
            statusId: 'ITEM_COMPLETED',
            orderStatusId: 'ORDER_COMPLETED',
          };

          const [incomingResp, readyForPickupResp] = await Promise.all([
            OrderService.getShipToStoreOrders(incomingParams),
            OrderService.getShipToStoreOrders(readyForPickupParams)
          ]);

          const isLastShipGroup = !hasError(incomingResp) && !hasError(readyForPickupResp) && incomingResp.data.ordersCount === 0 && readyForPickupResp.data.ordersCount === 0;

          if (isLastShipGroup) {
            try {
              const emailResp = await OrderService.sendHandoverNotification({ shipmentId });
              if (!hasError(emailResp)) {
                showToast(translate('Order handed over successfully and order completion email has been sent'));
              } else {
                logger.error('Error sending handover notification:', emailResp);
                showToast(translate('Order handed over successfully but something went wrong while sending the email notification'));
              }
            } catch (error) {
              logger.error('Error sending handover notification:', error);
              showToast(translate('Order handed over successfully but something went wrong while sending the email notification'));
            }
          } else {
            showToast(translate('Order handed over successfully'));
          }

          // Refresh the lists for UI update.
          this.getReadyForPickupOrders();
        } else {
          showToast(translate("Failed to handover order"));
          logger.error("Handover failed", resp);
        }
      }
      catch (err) {
        logger.error('Handover failed', err);
        showToast(translate("Something went wrong"));
      } 
        emitter.emit("dismissLoader");
      
    },

    async sendReadyForPickupEmail(order: any) {
      const header = translate('Resend email')
      const message = translate('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customerName })

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
                const resp = await OrderService.sendPickupScheduledNotification({ shipmentId: order.shipmentId });
                if (!hasError(resp)) {
                  showToast(translate("Email sent successfully"))
                } else {
                  showToast(translate("Something went wrong while sending the email."))
                }
              } catch (error) {
                showToast(translate("Something went wrong while sending the email."))
                logger.error(error)
              }
            }
          }]
        });
      return alert.present();
    },
    async openProofOfDeliveryModal(order: any, isViewModeOnly: any) {
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
          // Send the proof of delivery email
          const resp = await OrderService.sendPickupNotification(data.proofOfDeliveryData);
          
          if (hasError(resp)) {
            logger.error("Pickup notification failed:", resp);
            showToast(translate("Unable to save the details. Please try again."));
          } else {
            await this.store.dispatch('order/getCommunicationEvents', { orders: [order] });
            showToast(translate("Details have been successfully saved, and an email has been sent to the customer."));
          }
        } catch (err) {
          logger.error("Error in saving the details:", err);
          showToast(translate("Something went wrong"));
        } finally {
          emitter.emit("dismissLoader");
        }
      }
    }
  },
  ionViewWillEnter() {
    this.isScrollingEnabled = false;
    this.queryString = '';
    if (this.segmentSelected === 'incoming') {
      this.getIncomingOrders()
    } else if (this.segmentSelected === 'readyForPickup') {
      this.getReadyForPickupOrders()
    } else {
      this.getCompletedOrders()
    }
  },
  setup () {
    const router = useRouter();
    const store = useStore();
    const userStore = useUserStore()
    const segmentSelected = ref('incoming');
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      copyToClipboard,
      currentFacility,
      hasPermission,
      mailOutline,
      router,
      segmentSelected,
      store,
      translate
    };
  },
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
