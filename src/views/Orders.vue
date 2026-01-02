<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ currentFacility?.facilityName ? currentFacility?.facilityName : currentFacility?.facilityId }}</ion-title>
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
      <div v-if="segmentSelected === 'open' && orders.length">

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
              <ion-button data-testid="listpage-reject-button" v-if="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP'" color="danger" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="clear" @click.stop="openRejectOrderModal(order)">
                {{ translate("Reject") }}
              </ion-button>
              <ion-button size="default" v-if="getBopisProductStoreSettings('PRINT_PICKLISTS')" slot="end" fill="clear" @click.stop="printPicklist(order, order.shipGroup)">
                  <ion-icon :icon="printOutline" slot="icon-only" />
              </ion-button>
            </div>
          </ion-card>
        </div>
      </div>       
      <div v-else-if="segmentSelected === 'packed' && packedOrders.length">
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
      <div v-else-if="segmentSelected === 'completed' && completedOrders.length">
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
              <!-- <ion-button data-testid="packing-slip-button" v-if="getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" fill="clear" slot="end" @click.stop="printPackingSlip(order)">
                {{ translate('Print customer letter') }}
              </ion-button> -->
              <ion-button data-testid="proof-of-delivery-button" fill="clear" @click.stop="openProofOfDeliveryModal(order, hasCommunicationEvent(order.orderId))">
                {{ hasCommunicationEvent(order.orderId) ? translate('View Proof of Delivery') : translate('Proof of Delivery') }}
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
import { defineComponent, ref, computed } from "vue";
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
import { hasError } from '@/adapter';
import { translate, useUserStore } from "@hotwax/dxp-components";
import AssignPickerModal from "./AssignPickerModal.vue";
import { OrderService } from "@/services/OrderService";
import { UserService } from "@/services/UserService";
import { Actions, hasPermission } from '@/authorization'
import logger from "@/logger";
import RejectOrderItemModal from "@/components/RejectOrderItemModal.vue";
import ProofOfDeliveryModal from "@/components/ProofOfDeliveryModal.vue";

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
      isPackedOrdersScrollable: 'order/isPackedOrdersScrollable',
      isOpenOrdersScrollable: 'order/isOpenOrdersScrollable',
      isCompletedOrdersScrollable: 'order/isCompletedOrdersScrollable',
      notifications: 'user/getNotifications',
      unreadNotificationsStatus: 'user/getUnreadNotificationsStatus',
      getBopisProductStoreSettings: 'user/getBopisProductStoreSettings',
      getInventoryInformation: 'stock/getInventoryInformation',
      order: "order/getCurrent",
      communicationEvents: 'order/getCommunicationEvents'
    })
  },
  data() {
    return {
      queryString: '',
      isScrollingEnabled: false
    }
  },
  methods: {
    async assignPicker(order: any, shipGroup: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, shipGroup, facilityId }
      });
      assignPickerModal.onDidDismiss().then(async(result: any) => {
        emitter.emit("presentLoader");
        if(result.data?.selectedPicker) {
          await this.createPicklist(order, result.data.selectedPicker);
          const updatedOrder  = this.orders.find((ord: any) => ord.orderId === order.orderId);
          const updatedShipGroup = updatedOrder.shipGroups.find((sg: any) => sg.shipGroupSeqId === shipGroup.shipGroupSeqId);
          await this.store.dispatch('order/packShipGroupItems', { order: updatedOrder, shipGroup: updatedShipGroup })
        }
        emitter.emit("dismissLoader");
      })

      return assignPickerModal.present();
    },
    timeFromNow (time: any) {
      const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    timeFromNowInMillis (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async printPackingSlip(order: any) {
      // if the request to print packing slip is not yet completed, then clicking multiple times on the button
      // should not do anything
      if(order.isGeneratingPackingSlip) {
        return;
      }

      order.isGeneratingPackingSlip = true;
      await OrderService.printPackingSlip([order.shipmentId]);
      order.isGeneratingPackingSlip = false;
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
    async viewOrder(order: any, shipGroupSeqId: any, orderType: any) {
      // TODO: find a better approach to handle the case that when in open segment we can click on
      // order card to route on the order details page but not in the packed segment
      order['orderType'] = orderType
      await this.store.dispatch('order/updateCurrent', { order }).then(() => {
        this.$router.push({ path: `/orderdetail/${orderType}/${order.orderId}/${shipGroupSeqId}` })
      })
    },
    async getPickupOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.store.dispatch("order/getOpenOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
    },
    async getPackedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getPackedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
    },
    hasCommunicationEvent(orderId: string) {
      return (this.communicationEvents || []).some((e: any) => e.orderId === orderId);
    },
    async getCompletedOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;

      await this.store.dispatch("order/getCompletedOrders", { viewSize, viewIndex, queryString: this.queryString, facilityId: this.currentFacility?.facilityId });
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
    async loadMoreProducts (event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not get displayed
      if (!(this.isScrollingEnabled && (this.segmentSelected === 'open' ? this.isOpenOrdersScrollable : this.segmentSelected === 'packed' ? this.isPackedOrdersScrollable : this.isCompletedOrdersScrollable))) {
        await event.target.complete();
      }
      if (this.segmentSelected === 'open') {
        this.getPickupOrders(
          undefined,
          Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE).toString()
        ).then(async () => {
          await event.target.complete();
       });
      } else if (this.segmentSelected === 'packed') {
        this.getPackedOrders(
          undefined,
          Math.ceil(this.packedOrders.length / process.env.VUE_APP_VIEW_SIZE).toString()
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
    async readyForPickup (order: any, shipGroup: any) {
      if(this.getBopisProductStoreSettings('ENABLE_TRACKING') && !shipGroup.picklistId) return this.assignPicker(order, shipGroup, this.currentFacility?.facilityId);
      const pickup = shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
      const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
      const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customerName, space: '<br/><br/>'}) : '';

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },{
            text: header,
            handler: async () => {
              alert.dismiss();
              emitter.emit("presentLoader", {message: "Loading...", backdropDismiss: false});
              // Remove if part, single flow
              let orderIndex;
              if (!shipGroup.shipmentId) {
                await this.printPicklist(order, shipGroup)
                orderIndex = this.orders.findIndex((o: any) => o.orderId === order.orderId);
              }
              await this.store.dispatch('order/packShipGroupItems', { order: orderIndex >= 0 ? this.orders[orderIndex] : order, shipGroup: orderIndex >= 0 ? this.orders[orderIndex].shipGroup : shipGroup })
              emitter.emit("dismissLoader");
            }
          }]
        });
      return alert.present();
    },
    async packShippingOrders(currentOrder: any, shipGroup: any) {
      try {
        const resp = await OrderService.packOrder({
          'shipmentId': currentOrder.shipmentId,
          'orderId': currentOrder.orderId,
          'facilityId': shipGroup.facilityId
        })

        if(!hasError(resp)) {
          showToast(translate("Order packed and ready for delivery"));
          this.store.dispatch("order/removeOpenOrder", { order: currentOrder, shipGroup })
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Something went wrong"))
      }
    },
    async deliverShipment (order: any) {
      await this.store.dispatch('order/deliverShipment', order)
      .then((resp) => {
        if(!hasError(resp)) {
          showToast(translate('Order delivered to', {customerName: order.customerName}))
        }
      })
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
      const header = translate('Resend email')
      const message = translate('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customerName });

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },{
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
    getOrdersByPart(orders: Array<any>) {
      return Object.keys(orders).length ? orders.flatMap((order: any) => order.shipGroups.map((shipGroup: any) => ({ ...order, shipGroup }))) : [];
    },
    viewShipToStoreOrders() {
      this.$router.push({ path: '/ship-to-store-orders' })
    },
    viewNotifications() {
      this.store.dispatch('user/setUnreadNotificationsStatus', false)
      this.$router.push({ path: '/notifications' })
    },
    async printPicklist(order: any, shipGroup: any) {
      if(shipGroup.picklistId) {
        await OrderService.printPicklist(shipGroup.picklistId)
        return;
      }

      if(!this.getBopisProductStoreSettings('ENABLE_TRACKING')) {
        try {
          const resp = await UserService.ensurePartyRole({
            partyId: "_NA_",
            roleTypeId: "WAREHOUSE_PICKER",
          })

          if(hasError(resp)) {
            throw resp.data;
          }
        } catch (error) {
          showToast(translate("Something went wrong. Picklist can not be created."));
          logger.error(error)
          return;
        }
        await this.createPicklist(order, "_NA_");
        return;
      }

      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, shipGroup, facilityId: this.currentFacility.facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data?.selectedPicker) {
          this.createPicklist(order, result.data.selectedPicker)
        }
      })

      return assignPickerModal.present();
    },
    async createPicklist(order: any, selectedPicker: any) {
      let resp: any;

      const payload = {
        packageName: "A", //default package name
        facilityId: this.currentFacility?.facilityId,
        shipmentMethodTypeId: order.shipGroup.shipmentMethodTypeId,
        statusId: "PICKLIST_ASSIGNED",        
        pickers: selectedPicker ? [{
          partyId: selectedPicker,
          roleTypeId: "WAREHOUSE_PICKER"
        }] : [],
        orderItems: order.shipGroup.items.map((item: { orderId: string, orderItemSeqId: string, shipGroupSeqId: string, productId: string, quantity: number }) => ({
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          shipGroupSeqId: item.shipGroupSeqId,
          productId: item.productId,
          quantity: item.quantity
        }))
      };      

      try {
        resp = await OrderService.createPicklist(payload);
        if(!hasError(resp)) {
          // generating picklist after creating a new picklist
          await OrderService.printPicklist(resp.data.picklistId)
          const orders = JSON.parse(JSON.stringify(this.orders))
          const orderIndex = orders.findIndex((o: any) => o.orderId === order.orderId);
          let orderShipGroups = orders[orderIndex].shipGroups || [];
          orderShipGroups = orderShipGroups.map((shipGroup: any) => {
            if(shipGroup.shipGroupSeqId === order.shipGroup.shipGroupSeqId) {
              return { ...shipGroup, picklistId: resp.data.picklistId, shipmentId: resp.data.shipmentIds?.[0] }
            }
            return shipGroup;
          });
          order.shipGroup = { ...order.shipGroup, picklistId: resp.data.picklistId, shipmentId: resp.data.shipmentIds?.[0] };

          orders[orderIndex] = {
            ...orders[orderIndex],
            shipGroup: order.shipGroup,
            shipGroups: orderShipGroups
          };

          await this.store.dispatch("order/updateOpenOrder", { orders, total: orders.length })

        } else {
          throw resp.data;
        }
      } catch (err) {
        showToast(translate('Something went wrong. Picklist can not be created.'));
        emitter.emit("dismissLoader");
        return;
      }
    },
    async openRejectOrderModal(order:any) {
      const orderProps = order
      const rejectOrderModal = await modalController.create({
        component:RejectOrderItemModal,
        componentProps: {
          orderProps, 
        }
      })
      return rejectOrderModal.present()
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
      
      if (!isViewModeOnly && data?.confirmed && data?.proofOfDeliveryData) {
        emitter.emit("presentLoader");
        
        try {
          // Send the proof of delivery email
          const resp = await OrderService.sendPickupNotification(data.proofOfDeliveryData);
          
          if (hasError(resp)) {
            logger.error("Pickup notification failed:", resp);
            showToast(translate("Order delivered but failed to send handover email"));
          } else {
            showToast(translate("Order delivered and handover email sent successfully"));
          }
        } catch (err) {
          logger.error("Error in handover process:", err);
          showToast(translate("Something went wrong during handover"));
        } finally {
          emitter.emit("dismissLoader");
        }
      }
    }
  },
  ionViewWillEnter () {
    this.isScrollingEnabled = false;
    this.queryString = '';

    this.segmentSelected = this.order?.orderType || "open"

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
    const userStore = useUserStore()
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 
    
    return {
      Actions,
      callOutline,
      copyToClipboard,
      currentFacility,
      hasPermission,
      notificationsOutline,
      mailOutline,
      printOutline,
      router,
      segmentSelected,
      swapVerticalOutline,
      store,
      trailSignOutline,
      translate
    };
  },
});
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
