<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ currentFacility.name }}</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <div>
          <ion-searchbar :placeholder= "$t('Search Orders')" />
          <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
            <ion-segment-button value="open">
              <ion-label>{{ $t("Open") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="packed">
              <ion-label>{{ $t("Packed") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="segmentSelected === 'open'">
        <div v-for="order in orders" :key="order.orderId" v-show="order.parts.length > 0">
          <ion-card v-for="(orderPart, index) in order.parts" :key="index" @click.prevent="viewOrder(order)">
            <ion-item lines="none">
              <ion-label>
                <h1>{{ order.customer?.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-badge v-if="order.placedDate" color="dark">{{ moment.utc(order.placedDate).fromNow() }}</ion-badge>
                <ion-badge v-if="order.status.statusId !== 'ORDER_APPROVED'" color="danger">{{ $t('pending approval') }}</ion-badge>
              </div>
              <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
            </ion-item>

            <ProductListItem v-for="item in findShipGroupItems(orderPart.orderPartSeqId, order.items)" :key="item.orderItemSeqId" :item="item" />

            <ion-item v-if="order.customer?.phone">
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>{{ order.customer.phone }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.customer.phone)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full" v-if="order.customer?.email">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>{{ order.customer.email }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.customer.email)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <div class="border-top">
              <ion-button fill="clear" @click.stop="readyForPickup(order, orderPart)">
                {{ orderPart.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-if="segmentSelected === 'packed'">
        <div v-for="order in packedOrders" :key="order.orderId" v-show="getShipGroups(order.items).length > 0">
          <ion-card v-for="(shipGroup, index) in getShipGroups(order.items)" :key="index">
            <ion-item lines="none">
              <ion-label>
                <h1>{{ order.customerName }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <ion-badge v-if="order.orderDate" color="dark" slot="end">{{ moment.utc(order.orderDate).fromNow() }}</ion-badge>
            </ion-item>

            <ProductListItem v-for="item in getShipGroupItems(shipGroup, order.items)" :key="item.itemId" :item="item" />

            <ion-item v-if="order.phoneNumber">
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>{{ order.phoneNumber }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.phoneNumber)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full" v-if="order.email">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>{{ order.email }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.email)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <div class="border-top">
              <ion-button fill="clear" @click.stop="deliverShipment(order)">
                {{ order.shipmentMethodTypeId === 'STOREPICKUP' ? $t("Handover") : $t("Ship") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <ion-refresher slot="fixed" @ionRefresh="refreshOrders($event)">
        <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
      </ion-refresher>
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="segmentSelected === 'open' ? !isOpenOrdersScrollable : !isPackedOrdersScrollable">
        <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonBadge,
  IonButton,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
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
import { swapVerticalOutline, callOutline, mailOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { copyToClipboard } from '@/utils'
import * as moment from "moment-timezone";
import emitter from "@/event-bus"
import { Order, OrderPart } from "@/types";

export default defineComponent({
  name: 'Orders',
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
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
    emitter.on("refreshPickupOrders", this.getPickupOrders);
  },
  unmounted () {
    emitter.off("refreshPickupOrders", this.getPickupOrders);
  },
  computed: {
    ...mapGetters({
      orders: 'order/getOpenOrders',
      packedOrders: 'order/getPackedOrders',
      currentFacility: 'user/getCurrentFacility',
      isPackedOrdersScrollable: 'order/isPackedOrdersScrollable',
      isOpenOrdersScrollable: 'order/isOpenOrdersScrollable'
    })
  },
  methods: {
    async refreshOrders(event: any) {
      if(this.segmentSelected === 'open') {
        this.getPickupOrders().then(() => { event.target.complete() });
      } else {
        this.getPackedOrders().then(() => { event.target.complete() });
      }
    },
    async viewOrder (order: any) {
      // TODO: find a better approach to handle the case that when in open segment we can click on
      // order card to route on the order details page but not in the packed segment
      await this.store.dispatch('order/updateCurrent', { order }).then(() => {
        this.$router.push({ path: `/orderdetail/${order.orderId}` })
      })
    },
    async getPickupOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        sortBy: 'orderDate',
        sortOrder: 'Desc',
        viewSize,
        viewIndex,
        facilityId: this.currentFacility.facilityId
      }
      await this.store.dispatch("order/getOpenOrders", payload);
    },
    async getPackedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        sortBy: 'createdDate',
        sortOrder: 'Desc',
        viewSize,
        viewIndex,
        facilityId: this.currentFacility.facilityId
      };
      await this.store.dispatch("order/getPackedOrders", payload);
    },
    async loadMoreProducts (event: any) {
      if (this.segmentSelected === 'open') {
        this.getPickupOrders(
          undefined,
          Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
      } else {
        this.getPackedOrders(
          undefined,
          Math.ceil(this.packedOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
      }
    },
    async readyForPickup (order: Order, orderPart: OrderPart) {
      const pickup = orderPart.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP';
      const header = pickup ? this.$t('Ready for pickup') : this.$t('Ready to ship');
      const message = pickup ? this.$t('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customer.name, space: '<br/><br/>'}) : '';

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: header,
            handler: () => {
              this.store.dispatch('order/quickShipEntireShipGroup', {order, orderPart, facilityId: this.currentFacility.facilityId}).then((resp) => {
                if (resp.data._EVENT_MESSAGE_) this.getPickupOrders();
              })
            }
          }]
        });
      return alert.present();
    },
    async deliverShipment (order: any) {
      await this.store.dispatch('order/deliverShipment', order).then((resp) => {
        if (resp.data._EVENT_MESSAGE_) this.getPackedOrders();
      });
    },
    segmentChanged (e: CustomEvent) {
      this.segmentSelected = e.detail.value
      this.segmentSelected === 'open' ? this.getPickupOrders() : this.getPackedOrders();
    },
    getShipGroups (items: any) {
      // To get unique shipGroup, further it will use on ion-card iteration
      return Array.from(new Set(items.map((ele: any) => ele.shipGroupSeqId)))
    },
    getShipmentMethod (shipGroupSeqId: any, items: any) {
      /* To display the button label as per the shipmentMethodTypeId, this will only used on orders segment.
        Because we get the shipmentMethodTypeId on items level in wms-orders API.
        As we already get shipmentMethodTypeId on order level in readytoshiporders API hence we will not use this method on packed orders segment.
      */
      return items.find((ele: any) => ele.shipGroupSeqId == shipGroupSeqId).shipmentMethodTypeId
    },
    getShipGroupItems(shipGroupSeqId: any, items: any) {
      // To get all the items of same shipGroup, further it will use on pickup-order-card component to display line items
      return items.filter((item: any) => item.shipGroupSeqId == shipGroupSeqId)
    },
    findShipGroupItems(shipGroupSeqId: any, items: any) {
      // To get all the items of same shipGroup, further it will use on pickup-order-card component to display line items
      return items.filter((item: any) => item.orderPartSeqId == shipGroupSeqId)
    }
  },
  ionViewWillEnter () {
    this.segmentSelected === 'open' ? this.getPickupOrders() : this.getPackedOrders();
  },
  setup () {
    const router = useRouter();
    const store = useStore();
    const segmentSelected = ref('open');

    return {
      callOutline,
      copyToClipboard,
      mailOutline,
      moment,
      router,
      segmentSelected,
      swapVerticalOutline,
      store
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
}

.metadata {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  row-gap: 4px;
}

@media (min-width: 991px){
  ion-toolbar > div {
    display: flex;
  }
}
</style>