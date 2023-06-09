<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Shipping to store") }}</ion-title>
      </ion-toolbar>
      <div>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="queryString = $event.target.value; searchOrders()" :placeholder= "$t('Search customer')" />
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button value="incoming">
            <ion-label>{{ $t("Incoming") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="readyForPickup">
            <ion-label>{{ $t("Ready for pickup") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="completed">
            <ion-label>{{ $t("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>    
    </ion-header>
    <ion-content>
      <div v-if="segmentSelected === 'incoming'">
        <div v-for="(order, index) in incomingOrders" :key="index" v-show="order.items.length">
          <ion-card button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.firstName }} {{ order.lastName }}</h1>
                <p>{{ order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.createdDate">{{ getDateTime(order.createdDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />

            <div class="border-top">
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="scheduleOrderForPickup(order)">
                {{ $t("Arrived") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-if="segmentSelected === 'readyForPickup'">
        <div v-for="(order, index) in readyForPickupOrders" :key="index" v-show="order.items.length">
          <ion-card button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.firstName }} {{ order.lastName }}</h1>
                <p>{{ order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.createdDate">{{ getDateTime(order.createdDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />

            <div class="border-top">
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="handoverOrder(order.shipmentId)">
                {{ $t("Handover") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <div v-if="segmentSelected === 'completed'">
        <div v-for="(order, index) in completedOrders" :key="index" v-show="order.items.length">
          <ion-card button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.firstName }} {{ order.lastName }}</h1>
                <p>{{ order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-note v-if="order.createdDate">{{ getDateTime(order.createdDate) }}</ion-note>
              </div>
            </ion-item>

            <ProductListItem v-for="item in order.items" :key="item.productId" :item="item" :isShipToStoreOrder=true />
          </ion-card>
        </div>
      </div>
      <ion-refresher slot="fixed" @ionRefresh="refreshOrders($event)">
        <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
      </ion-refresher>
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="segmentSelected === 'incoming' ? !isIncomingOrdersScrollable : segmentSelected === 'readyForPickup' ? !isReadyForPickupOrdersScrollable : !isCompletedOrdersScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import ProductListItem from '@/components/ProductListItem.vue'
import { swapVerticalOutline, callOutline, mailOutline, printOutline, trailSignOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { copyToClipboard } from '@/utils'
import { DateTime } from 'luxon';
import emitter from "@/event-bus"
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Orders',
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
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
      currentFacility: 'user/getCurrentFacility',
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
      queryString: ''
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

      await this.store.dispatch("order/getShipToStoreIncomingOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
    },
    async getReadyForPickupOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getShipToStoreReadyForPickupOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
    },
    async getCompletedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getCompletedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
    },
    async loadMoreProducts (event: any) {
      if (this.segmentSelected === 'incoming') {
        this.getIncomingOrders(
          undefined,
          Math.ceil(this.incomingOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
      } else if (this.segmentSelected === 'packed') {
        this.getReadyForPickupOrders(
          undefined,
          Math.ceil(this.readyForPickupOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
      } else {
        this.getCompletedOrders(
          undefined,
          Math.ceil(this.completedOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
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
    async scheduleOrderForPickup(order: any) {
      const header = this.$t('Ready for pickup')
      const message = this.$t('Order will be marked as ready for pickup and an email notification will be sent to . This action is irreversible.', { customer: order.firstName + order.lastName })

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Send'),
            handler: async () => {
              await this.store.dispatch("order/scheduleOrderForPickup", order.shipmentId);
            }
          }]
        });
      return alert.present();
    },
    async handoverOrder(shipmentId: string) {
      const header = this.$t('Complete order')
      const message = this.$t('Order will be marked as completed. This action is irreversible.');

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Complete'),
            handler: async () => {
              await this.store.dispatch("order/handoverOrder", shipmentId);
            }
          }]
        });
      return alert.present();
    }
  },
  ionViewWillEnter () {
    this.queryString = '';
    if(this.segmentSelected === 'incoming') {
      this.getIncomingOrders()
    } else if(this.segmentSelected === 'packed') {
      this.getReadyForPickupOrders()
    } else {
      this.getCompletedOrders()
    }
  },
  setup () {
    const router = useRouter();
    const store = useStore();
    const segmentSelected = ref('incoming');

    return {
      Actions,
      callOutline,
      copyToClipboard,
      hasPermission,
      mailOutline,
      printOutline,
      router,
      segmentSelected,
      swapVerticalOutline,
      store,
      trailSignOutline
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
