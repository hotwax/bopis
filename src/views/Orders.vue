<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ currentFacility?.facilityName }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="viewNotifications()">
            <ion-icon slot="icon-only" :icon="notificationsOutline" :color="(unreadNotificationsStatus && notifications.length) ? 'primary' : ''" />
          </ion-button>
          <ion-button @click="viewShipToStoreOrders()">
            <ion-icon slot="icon-only" :icon="trailSignOutline" />
          </ion-button>
        </ion-buttons>
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
          <ion-segment-button value="completed">
            <ion-label>{{ $t("Completed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>    
    </ion-header>
    <ion-content>
      <div v-if="segmentSelected === 'open'">
        <div v-for="(order, index) in getOrdersByPart(orders)" :key="index" v-show="order.parts.length > 0">
          <ion-card button @click.prevent="viewOrder(order, order.part)">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customer.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <div class="metadata">
                <ion-badge v-if="order.placedDate" color="dark">{{ timeFromNow(order.placedDate) }}</ion-badge>
                <ion-badge v-if="order.statusId !== 'ORDER_APPROVED'" color="danger">{{ $t('pending approval') }}</ion-badge>
              </div>
              <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
            </ion-item>

            <ion-item v-if="order.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ $t("Handling Instructions") }}</p>
                <p>{{ order.shippingInstructions }}</p>
              </ion-label>
            </ion-item>

            <ProductListItem v-for="item in order.part.items" :key="item.productId" :item="item" />

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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="readyForPickup(order, order.part)">
                {{ order.part.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>      
      <div v-if="segmentSelected === 'packed'">
        <div v-for="(order, index) in getOrdersByPart(packedOrders)" :key="index" v-show="order.parts.length > 0">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customer.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
                <p v-if="configurePicker">{{ order.pickers ? $t("Picked by", { pickers: order.pickers }) : $t("No picker assigned.") }}</p>
              </ion-label>
              <ion-badge v-if="order.placedDate" color="dark" slot="end">{{ timeFromNow(order.placedDate) }}</ion-badge>
            </ion-item>

            <ion-item v-if="order.shippingInstructions" color="light" lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ $t("Handling Instructions") }}</p>
                <p>{{ order.shippingInstructions }}</p>
              </ion-label>
            </ion-item>

            <ProductListItem v-for="item in order.part.items" :key="item.productId" :item="item" />

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
              <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="deliverShipment(order)">
                {{ order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Handover") : $t("Ship") }}
              </ion-button>
              <ion-button v-if="showPackingSlip" fill="clear" slot="end" @click="printPackingSlip(order)">
                <ion-icon slot="icon-only" :icon="printOutline" />
              </ion-button>
              <ion-button v-if="order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP'" fill="clear" slot="end" @click="sendReadyForPickupEmail(order)">
                <ion-icon slot="icon-only" :icon="mailOutline" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>
      <div v-if="segmentSelected === 'completed'">
        <div v-for="(order, index) in getOrdersByPart(completedOrders)" :key="index" v-show="order.parts.length > 0">
          <ion-card>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h1>{{ order.customer.name }}</h1>
                <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
              </ion-label>
              <ion-badge v-if="order.placedDate" color="dark" slot="end">{{ timeFromNow(order.placedDate) }}</ion-badge>
            </ion-item>

            <ProductListItem v-for="item in order.part.items" :key="item.productId" :item="item" />

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
          </ion-card>
        </div>
      </div>
      <ion-refresher slot="fixed" @ionRefresh="refreshOrders($event)">
        <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
      </ion-refresher>
      <ion-infinite-scroll @ionInfinite="loadMoreProducts($event)" threshold="100px" :disabled="segmentSelected === 'open' ? !isOpenOrdersScrollable : segmentSelected === 'packed' ? !isPackedOrdersScrollable : !isCompletedOrdersScrollable">
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
  IonButtons,
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
  modalController
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import ProductListItem from '@/components/ProductListItem.vue'
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
  notificationsOutline,
  printOutline,
  trailSignOutline
} from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { copyToClipboard, showToast } from '@/utils'
import { DateTime } from 'luxon';
import emitter from "@/event-bus"
import { api, hasError } from '@/adapter';
import { translate } from "@/i18n";
import AssignPickerModal from "./AssignPickerModal.vue";
import { OrderService } from "@/services/OrderService";
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Orders',
  components: {
    IonBadge,
    IonButton,
    IonButtons,
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
      completedOrders: 'order/getCompletedOrders',
      configurePicker: "user/configurePicker",
      currentFacility: 'user/getCurrentFacility',
      isPackedOrdersScrollable: 'order/isPackedOrdersScrollable',
      isOpenOrdersScrollable: 'order/isOpenOrdersScrollable',
      isCompletedOrdersScrollable: 'order/isCompletedOrdersScrollable',
      showPackingSlip: 'user/showPackingSlip',
      notifications: 'user/getNotifications',
      unreadNotificationsStatus: 'user/getUnreadNotificationsStatus'
    })
  },
  data() {
    return {
      queryString: ''
    }
  },
  methods: {
    async assignPicker(order: any, part: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId }
      });
      return assignPickerModal.present();
    },
    timeFromNow (time: any) {
      const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
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
        // console.error(err)
      }


    },
    async refreshOrders(event: any) {
      if(this.segmentSelected === 'open') {
        this.getPickupOrders().then(() => { event.target.complete() });
      } else if (this.segmentSelected === 'packed') {
        this.getPackedOrders().then(() => { event.target.complete() });
      } else {
        this.getCompletedOrders().then(() => { event.target.complete() });
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
    async getCompletedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getCompletedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility.facilityId });
    },
    async loadMoreProducts (event: any) {
      if (this.segmentSelected === 'open') {
        this.getPickupOrders(
          undefined,
          Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(() => {
          event.target.complete();
        })
      } else if (this.segmentSelected === 'packed') {
        this.getPackedOrders(
          undefined,
          Math.ceil(this.packedOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
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
    async readyForPickup (order: any, part: any) {
      if(this.configurePicker) return this.assignPicker(order, part, this.currentFacility.facilityId);
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
              this.store.dispatch('order/packShipGroupItems', {order, part, facilityId: this.currentFacility.facilityId})
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

      if(this.segmentSelected === 'open') {
        this.getPickupOrders()
      } else if(this.segmentSelected === 'packed') {
        this.getPackedOrders()
      } else {
        this.getCompletedOrders()
      }
    },
    async searchOrders() {
      if(this.segmentSelected === 'open') {
        this.getPickupOrders()
      } else if(this.segmentSelected === 'packed') {
        this.getPackedOrders()
      } else {
        this.getCompletedOrders()
      }
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async sendReadyForPickupEmail(order: any) {
      const header = this.$t('Resend ready for pickup email')
      const message = this.$t('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customer.name });

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
              try {
                const resp = await OrderService.sendPickupScheduledNotification({ shipmentId: order.shipmentId });
                if (!hasError(resp)) {
                  showToast(translate("Email sent successfully"))
                } else {
                  showToast(translate("Something went wrong while sending the email."))
                }
              } catch (error) {
                showToast(translate("Something went wrong while sending the email."))
                console.error(error)
              }
            }
          }]
        });
      return alert.present();
    },
    getOrdersByPart(orders: Array<any>) {
      return Object.keys(orders).length ? orders.flatMap((order: any) => order.parts.map((part: any) => ({ ...order, part }))) : [];
    },
    viewShipToStoreOrders() {
      this.$router.push({ path: '/ship-to-store-orders' })
    },
    viewNotifications() {
      this.store.dispatch('user/setUnreadNotificationsStatus', false)
      this.$router.push({ path: '/notifications' })
    }
  },
  ionViewWillEnter () {
    this.queryString = '';

    if(this.segmentSelected === 'open') {
      this.getPickupOrders()
    } else if(this.segmentSelected === 'packed') {
      this.getPackedOrders()
    } else {
      this.getCompletedOrders()
    }
  },
  setup () {
    const router = useRouter();
    const store = useStore();
    const segmentSelected = ref('open');

    return {
      Actions,
      callOutline,
      copyToClipboard,
      hasPermission,
      notificationsOutline,
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
