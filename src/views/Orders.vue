<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ currentFacility.name }}</ion-title>
      </ion-toolbar>

      <div>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" @keyup.enter="queryString = $event.target.value; searchOrders()" :placeholder= "$t('Search Orders')" />
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button value="open">
            <ion-label>{{ $t("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packed">
            <ion-label>{{ $t("Packed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>    
    </ion-header>
    <ion-content>
      <div v-if="segmentSelected === 'open'">
        <div v-for="order in orders" :key="order.orderId" v-show="order.parts.length > 0">
          <ion-card v-for="(part, index) in order.parts" :key="index" @click.prevent="viewOrder(order, part)">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customer.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-badge v-if="order.placedDate" color="dark">{{ moment.utc(order.placedDate).fromNow() }}</ion-badge>
                <ion-badge v-if="order.statusId !== 'ORDER_APPROVED'" color="danger">{{ $t('pending approval') }}</ion-badge>
              </div>
              <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
            </ion-item>

            <ProductListItem v-for="item in part.items" :key="item.productId" :item="item" />

            <ion-item v-if="order.customer.phoneNumber">
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>{{ order.customer.phoneNumber }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click.stop="copyToClipboard(order.customer.phoneNumber)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full" v-if="order.customer.email">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>{{ order.customer.email }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click.stop="copyToClipboard(order.customer.email)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <div class="border-top">
              <ion-button fill="clear" @click.stop="readyForPickup(order, part)">
                {{ part.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-if="segmentSelected === 'packed'">
        <div v-for="order in packedOrders" :key="order.orderId" v-show="order.parts.length > 0">
          <ion-card v-for="(part, index) in order.parts" :key="index">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customer.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <ion-badge v-if="order.placedDate" color="dark" slot="end">{{ moment.utc(order.placedDate).fromNow() }}</ion-badge>
            </ion-item>

            <ProductListItem v-for="item in part.items" :key="item.productId" :item="item" />

            <ion-item v-if="order.customer.phoneNumber">
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>{{ order.customer.phoneNumber }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click.stop="copyToClipboard(order.customer.phoneNumber)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full" v-if="order.customer.email">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>{{ order.customer.email }}</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click.stop="copyToClipboard(order.customer.email)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <div class="border-top">
              <ion-button fill="clear" @click.stop="deliverShipment(order)">
                {{ part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Handover") : $t("Ship") }}
              </ion-button>
              <ion-button v-if="showPackingSlip" fill="clear" slot="end" @click="printPackingSlip(order)">
                <ion-icon slot="icon-only" :icon="print" />
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
import { swapVerticalOutline, callOutline, mailOutline, print } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { copyToClipboard, hasError, showToast } from '@/utils'
import * as moment from "moment-timezone";
import emitter from "@/event-bus"
import api from "@/api"
import { translate } from "@/i18n";

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
      isOpenOrdersScrollable: 'order/isOpenOrdersScrollable',
      showPackingSlip: 'user/showPackingSlip'
    })
  },
  data() {
    return {
      queryString: ''
    }
  },
  methods: {
    async printPackingSlip(order: any) {

      try {
        // Get packing slip from the server
        const response: any = await api({
          method: 'get',
          url: 'PackingSlip.pdf',
          params: {
            shipmentId: order.shipmentId
          },
          responseType: "blob"
        })

        if (!response || response.status !== 200 || hasError(response)) {
          showToast(translate("Failed to load packing slip"))
          return;
        }

        // Generate local file URL for the blob received
        const pdfUrl = window.URL.createObjectURL(response.data);
        // Open the file in new tab
        (window as any).open(pdfUrl, "_blank").focus();

      } catch(err) {
        showToast(translate("Failed to load packing slip"))
        console.error(err)
      }


    },
    async refreshOrders(event: any) {
      if(this.segmentSelected === 'open') {
        this.getPickupOrders().then(() => { event.target.complete() });
      } else {
        this.getPackedOrders().then(() => { event.target.complete() });
      }
    },
    async viewOrder (order: any, part: any) {
      // TODO: find a better approach to handle the case that when in open segment we can click on
      // order card to route on the order details page but not in the packed segment
      await this.store.dispatch('order/updateCurrent', { order }).then(() => {
        this.$router.push({ path: `/orderdetail/${order.orderId}/${part.orderPartSeqId}` })
      })
    },
    async getPickupOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getOpenOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
    },
    async getPackedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getPackedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
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
    async readyForPickup (order: any, part: any) {
      const pickup = part.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP';
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
              this.store.dispatch('order/quickShipEntireShipGroup', {order, part, facilityId: this.currentFacility.facilityId})
            }
          }]
        });
      return alert.present();
    },
    async deliverShipment (order: any) {
      await this.store.dispatch('order/deliverShipment', order)
    },
    segmentChanged (e: CustomEvent) {
      this.queryString = ''
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
    async searchOrders() {
      if(this.segmentSelected === 'open') {
        this.getPickupOrders()
      } else {
        this.getPackedOrders()
      }
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
  },
  ionViewWillEnter () {
    this.queryString = '';
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
      print,
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
  ion-header > div {
    display: flex;
  }
}
</style>