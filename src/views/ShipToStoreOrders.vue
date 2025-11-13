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
          <ion-card button>
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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)|| order.shipmentStatusId!='SHIPMENT_PACKED'" fill="clear" @click.stop="confirmScheduleOrderForPickup(order)">
                {{ translate("Arrived") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-if="segmentSelected === 'readyForPickup' && readyForPickupOrders.length">
        <div v-for="(order, index) in readyForPickupOrders" :key="index" v-show="order.items.length">
          <ion-card button>
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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="confirmHandoverOrder(order.shipmentId)">
                {{ translate("Handover") }}
              </ion-button>
              <ion-button fill="clear" slot="end" @click="sendReadyForPickupEmail(order)">
                <ion-icon slot="icon-only" :icon="mailOutline" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <div v-if="segmentSelected === 'completed' && completedOrders.length">
        <div v-for="(order, index) in completedOrders" :key="index" v-show="order.items.length">
          <ion-card button>
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
    })
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
          Math.ceil(this.incomingOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      } else if (this.segmentSelected === 'packed') {
        this.getReadyForPickupOrders(
          undefined,
          Math.ceil(this.readyForPickupOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      } else {
        this.getCompletedOrders(
          undefined,
          Math.ceil(this.completedOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
        });
      }
    },
    segmentChanged (event: CustomEvent) {
      this.queryString = ''
      this.segmentSelected = event.detail.value

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
      const message = translate('Order will be marked as ready for pickup and an email notification will be sent to . This action is irreversible.', { customerName: `${order.firstName} ${order.lastName}` });

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
              await this.scheduleOrderForPickup(order.shipmentId)
            }
          }]
        });
      return alert.present();
    },
    async scheduleOrderForPickup(shipmentId: string) {
      emitter.emit("presentLoader");
      let resp;
      try {
        const payload = {
          shipmentId: shipmentId
        };
        resp = await OrderService.shipOrder(payload);
        if (!hasError(resp)) {
          // Send pickup notification email
          resp = await OrderService.sendPickupScheduledNotification({ shipmentId });
          // Refresh the incoming orders list
          this.getIncomingOrders();

          if (!hasError(resp)) {
            showToast(translate('Order marked as ready for pickup, an email notification has been sent to the customer'));
          } else {
            showToast(translate('Order marked as ready for pickup but something went wrong while sending the email notification'));
          }
        }   
      } catch (err) {
        logger.error('Schedule order for pickup error:', err);
        showToast(translate("Something went wrong"));
      }finally{
        emitter.emit("dismissLoader");
      }

      return resp;
    },
    async confirmHandoverOrder(shipmentId: string) {
      const header = translate('Complete order')
      const message = translate('Order will be marked as completed. This action is irreversible.');

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
              await this.handoverOrder(shipmentId)
            }
          }]
        });
      return alert.present();
    },
  async handoverOrder(shipmentId: string) {
    emitter.emit("presentLoader");
  
    try {
      const resp = await OrderService.handoverShipToStoreOrder(shipmentId);
      
      if (!hasError(resp)) {
        this.getReadyForPickupOrders(); // Refresh
        showToast(translate('Order handed over successfully'));
      } else {
        showToast(translate("Failed to handover order"));
        logger.error("Handover failed", resp);
      }
      
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
    }
    try {
      const resp = await OrderService.handoverShipToStoreOrder(shipmentId);
      
      if (!hasError(resp)) {
        this.getReadyForPickupOrders(); // Refresh
        showToast(translate('Order handed over successfully'));
      } else {
        showToast(translate("Failed to handover order"));
        logger.error("Handover failed", resp);
      }
      
    } catch (err) {
      logger.error(err);
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
  },
  ionViewWillEnter() {
    this.isScrollingEnabled = false;
    this.queryString = '';
    if (this.segmentSelected === 'incoming') {
      this.getIncomingOrders()
    } else if (this.segmentSelected === 'packed') {
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
