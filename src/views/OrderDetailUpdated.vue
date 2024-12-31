<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="orderType === 'packed' && order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP'" class="ion-hide-md-up" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="sendReadyForPickupEmail(order)">
            <ion-icon slot="icon-only" :icon="mailOutline" />
          </ion-button>
          <ion-button :disabled="!order?.orderId" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="orderType === 'open'" class="ion-hide-md-up" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" @click="rejectOrder()">
            <ion-icon slot="icon-only" color="danger" :icon="bagRemoveOutline" />
          </ion-button>
          <ion-button v-else-if="orderType === 'packed' && getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" :class="order.part?.shipmentMethodEnum?.shipmentMethodEnumId !== 'STOREPICKUP' ? 'ion-hide-md-up' : ''" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? printPackingSlip(order) : printShippingLabelAndPackingSlip(order)">
            <ion-icon slot="icon-only" :icon="printOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Empty state -->
      <div class="empty-state" v-if="!order?.orderId">
        <p>{{ translate("Order not found")}}</p>
      </div>
      <main v-else>
        <aside>
          <!-- Timeline -->
          <ion-item lines="none">
            <ion-icon slot="start" :icon="timeOutline" class="mobile-only" />
            <h2>{{ translate("Timeline") }}</h2>
            <!-- <ion-badge slot="end" :color="getColorByDesc(orderStatuses[order.statusId].label) || getColorByDesc('default')">{{ translate(orderStatuses[order.statusId].label) }}</ion-badge> -->
          </ion-item>

          <ion-list class="desktop-only">
            <ion-item v-if="order.orderDate">
              <ion-icon :icon="sunnyOutline" slot="start" />
              <ion-label>
                {{ translate("Created in Shopify") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.orderDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.entryDate">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.entryDate) }}</p>
                {{ translate("Imported from Shopify") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.entryDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.approvedDate">
              <ion-icon :icon="pulseOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.approvedDate) }}</p>
                {{ translate("Approved for fulfillment") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.approvedDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.completedDate">
              <ion-icon :icon="pulseOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.completedDate) }}</p>
                {{ translate("Order completed") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.completedDate) }}</ion-note>
            </ion-item>
          </ion-list>
        </aside>
        <section>
          <ion-item lines="none">
            <ion-icon slot="start" :icon="ticketOutline" />
            <ion-label>
              <h1>{{ order.orderName }}</h1>
              <p>{{ order.orderId }}</p>
            </ion-label>
          </ion-item>
          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ProductListItem :item="item" />
            <!-- Checking for true as a string as the settingValue contains a string and not boolean-->
            <!-- <div v-if="orderType === 'open' && partialOrderRejectionConfig?.settingValue == 'true'" class="border-top">
              <ion-button :disabled="order?.readyToHandover || order.readyToShip || order?.rejected" fill="clear" @click="openReportAnIssueModal(item)">
                {{ translate("Report an issue") }}
              </ion-button>
            </div> -->
          </ion-card>
          <p v-if="!order.part?.items?.length" class="empty-state">{{ translate('All order items are rejected') }}</p>

          <ion-item lines="none" v-if="orderType === 'open'">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" @click="readyForPickup(order, order.part)">
              <ion-icon slot="start" :icon="bagCheckOutline"/>
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Items") }}
            </ion-button>
          </ion-item>

          <ion-item lines="none" v-else-if="orderType === 'packed'" class="ion-hide-md-down">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" expand="block" fill="outline" @click="order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? sendReadyForPickupEmail(order) : printShippingLabelAndPackingSlip(order)">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Resend customer email") : translate("Generate shipping documents") }}
            </ion-button>
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" expand="block" @click="deliverShipment(order)">
              {{ order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
          </ion-item>

          <ion-accordion-group v-if="order.shipGroups?.length">
            <ion-accordion>
              <ion-item slot="header">
                <ion-label>{{ translate("Other shipments in this order") }}</ion-label>
              </ion-item>
              <div class="ion-padding" slot="content">
                <ion-card v-for="shipGroup in order.shipGroups" :key="shipGroup.shipmentId">
                  <ion-card-header>
                    <div>
                      <ion-card-subtitle class="overline">{{ getfacilityTypeDesc(shipGroup.facilityTypeId) }}</ion-card-subtitle>
                      <ion-card-title>{{ shipGroup.facilityName }}</ion-card-title>
                      {{ shipGroup.shipGroupSeqId }}
                    </div>
                    <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">{{ shipGroup.category ? shipGroup.category : translate('Pending allocation') }}</ion-badge>
                  </ion-card-header>
        
                  <ion-item v-if="shipGroup.carrierPartyId">
                    {{ getPartyName(shipGroup.carrierPartyId) }}
                    <ion-label slot="end">{{ shipGroup.trackingCode }}</ion-label>
                    <ion-icon slot="end" :icon="locateOutline" />
                  </ion-item>
        
                  <ion-item v-if="shipGroup.shippingInstructions" color="light" lines="none">
                    <ion-label class="ion-text-wrap">
                      <p class="overline">{{ translate("Handling Instructions") }}</p>
                      <p>{{ shipGroup.shippingInstructions }}</p>
                    </ion-label>
                  </ion-item>
        
                  <ion-item lines="none" v-for="item in shipGroup.items" :key="item">
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label class="ion-text-wrap">
                      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                      <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    </ion-label>

                    <div slot="end">
                      <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                      <div v-else-if="getProductStock(item.productId).quantityOnHandTotal >= 0" class="atp-info">
                        <ion-note slot="end"> {{ translate("on hand", { count: getProductStock(item.productId).quantityOnHandTotal ?? '0' }) }} </ion-note>
                        <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                          <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                        </ion-button>
                      </div>
                      <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId, shipGroup.shipGroupSeqId)">
                        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                      </ion-button>
                    </div>
                  </ion-item>
                </ion-card>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </section>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ order?.customer?.name || order?.customer?.partyId }}</ion-card-title>
          </ion-card-header>
          <ion-list>
            <ion-item>
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label class="ion-text-wrap">{{ order.billingEmail || "-" }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>{{ order.billingPhone || "-" }}</ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-icon :icon="cashOutline" slot="start" />
              <ion-label v-if="order.billingAddress" class="ion-text-wrap">
                {{ order.billingAddress.toName }}
                <p>{{ order.billingAddress.address1 }}</p>
                <p>{{ order.billingAddress.address2 }}</p>
                <p>{{ order.billingAddress.city }} {{ order.billingAddress.city && order.billingAddress.postalCode && ',' }} {{ order.billingAddress.postalCode }}</p>
                <p>{{ order.billingAddress.stateName }} {{ order.billingAddress.stateName && order.billingAddress.countryName && ',' }} {{ order.billingAddress.countryName }}</p>
              </ion-label>
              <ion-label v-else>{{ "-" }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>
      </main>

      <ion-fab v-if="orderType === 'open' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" @click="readyForPickup(order, order.part)">
          <ion-icon :icon="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? bagHandleOutline : giftOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-fab v-else-if="orderType === 'packed' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="deliverShipment(order)">
          <ion-icon :icon="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? accessibilityOutline : checkmarkOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonLabel,
  IonNote,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
  popoverController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  accessibilityOutline,
  callOutline,
  cashOutline,
  copyOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  checkmarkOutline,
  cubeOutline,
  giftOutline,
  informationCircleOutline,
  locateOutline,
  mailOutline,
  printOutline,
  pulseOutline,
  sendOutline,
  bagHandleOutline,
  bagRemoveOutline,
  timeOutline,
  ticketOutline,
  bagCheckOutline,
  sunnyOutline,
  downloadOutline
} from "ionicons/icons";
import ProductListItem from '@/components/ProductListItem.vue'
import { useRouter } from 'vue-router'
import { Actions, hasPermission } from '@/authorization'
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import ReportAnIssueModal from '@/components/ReportAnIssueModal.vue';
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { copyToClipboard, getColorByDesc, getFeature, showToast } from '@/utils'
import { DateTime } from "luxon";
import { api, hasError } from '@/adapter';
import { OrderService } from "@/services/OrderService";
import RejectOrderModal from "@/components/RejectOrderModal.vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import EditPickerModal from "@/components/EditPickerModal.vue";
import emitter from '@/event-bus'
import logger from "@/logger";
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'

export default defineComponent({
  name: "OrderDetail",
  components: {
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonPage,
    IonLabel,
    IonNote,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    ProductListItem,
    IonFab,
    IonFabButton,
  },
  data() {
    return {
      customerEmail: '',
      statusColor: {
        'PAYMENT_AUTHORIZED': '',
        'PAYMENT_CANCELLED': 'warning',
        'PAYMENT_DECLINED': 'warning',
        'PAYMENT_NOT_AUTH': 'warning',
        'PAYMENT_NOT_RECEIVED': 'warning',
        'PAYMENT_RECEIVED': '',
        'PAYMENT_REFUNDED': 'warning',
        'PAYMENT_SETTLED': ''
      } as any
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPartyName: 'util/getPartyName',
      getBopisProductStoreSettings: 'user/getBopisProductStoreSettings'
    })
  },
  props: ['orderType', 'orderId', 'orderPartSeqId'],
  methods: {
    async fetchProductStock(productId: string, shipGroupSeqId: any) {
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
      await this.store.dispatch('stock/fetchStock', { productId })
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
    },
    async assignPicker(order: any, part: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data.selectedPicker) {
          await this.store.dispatch('order/packShipGroupItems', { order, part, facilityId, selectedPicker: result.data.selectedPicker })
        }
      })

      return assignPickerModal.present();
    },
    async editPicker(order: any) {
      const editPickerModal = await modalController.create({
        component: EditPickerModal,
        componentProps: { order }
      });

      editPickerModal.onDidDismiss().then((result) => {
        if(result.data?.selectedPicker){
          const selectedPicker = result.data.selectedPicker
          this.order.pickers = selectedPicker.name
          this.order.pickerIds = [selectedPicker.id]
          this.store.dispatch('order/updateCurrent', { order: this.order })
        }
      })

      return editPickerModal.present();
    },
    async deliverShipment(order: any) {
      await this.store.dispatch('order/deliverShipment', order)
    },
    async openOrderItemRejHistoryModal() {
      const orderItemRejHistoryModal = await modalController.create({
        component: OrderItemRejHistoryModal,
      });
      return orderItemRejHistoryModal.present();
    },
    async openReportAnIssueModal(item: any) {
      const reportAnIssueModal = await modalController.create({
        component: ReportAnIssueModal,
        componentProps: { item }
      });
      return reportAnIssueModal.present();
    },
    async getOrderDetail(orderId: any, orderPartSeqId: any, orderType: any) {
      const payload = {
        facilityId: this.currentFacility?.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", { payload, orderType })
      await this.store.dispatch("order/fetchPaymentDetail")
      await this.store.dispatch("order/getShippingPhoneNumber")
    },
    async rejectOrder() {
      const rejectOrderModal = await modalController.create({
        component: RejectOrderModal
      });
      return rejectOrderModal.present();
    },
    async readyForPickup(order: any, part: any) {
      if(this.getBopisProductStoreSettings('ENABLE_TRACKING') && order.isPicked !== 'Y') return this.assignPicker(order, part, this.currentFacility?.facilityId);
      const pickup = part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP';
      const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
      const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customer.name, space: '<br/><br/>' }) : '';

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
              if(!pickup) {
                this.packShippingOrders(order, part);
              } else {
                this.store.dispatch('order/packShipGroupItems', {order, part, facilityId: this.currentFacility?.facilityId})
              }
            }
          }]
        });
      return alert.present();
    },
    async packShippingOrders(currentOrder: any, part: any) {
      try {
        const resp = await OrderService.packOrder({
          'picklistBinId': currentOrder.picklistBinId,
          'orderId': currentOrder.orderId
        })

        if(!hasError(resp)) {
          showToast(translate("Order packed and ready for delivery"));
          this.store.dispatch("order/updateCurrent", { order: { ...currentOrder, readyToShip: true } }) 
          this.store.dispatch("order/removeOpenOrder", { order: currentOrder, part })
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Something went wrong"))
      }
    },
    async fetchRejectReasons() {
      await this.store.dispatch('util/fetchRejectReasons');
    },
    timeFromNow(time: any) {
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
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        }
        catch {
          showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'packing slip'}));
        }

      } catch(err) {
        showToast(translate("Failed to load packing slip"))
        logger.error(err)
      }
    },
    async getCustomerContactDetails() {
      try {
        const resp = await OrderService.getCustomerContactDetails(this.$route.params.orderId)
        if (!hasError(resp)) {
          this.customerEmail = resp.data.orderContacts.email.email
        }
      } catch (error) {
        logger.error(error)
      }
    },
    async sendReadyForPickupEmail(order: any) {
      const header = translate('Resend email')
      const message = translate('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customer.name });

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
    async printShippingLabelAndPackingSlip(order: any) {
      await OrderService.printShippingLabelAndPackingSlip(order.shipmentId)
    },
    async openInventoryDetailPopover(Event: any, item: any){
      const popover = await popoverController.create({
        component: InventoryDetailsPopover,
        event: Event,
        showBackdrop: false,
        componentProps: { item }
      });
      await popover.present();
    },
    formatDateTime(date: any) {
      return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
    },
    findTimeDiff(startTime: any, endTime: any) {
      const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]);
      let diffString = "+ ";
      if(timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `
      if(timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `
      if(timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `
      if(timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `
      if(timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes`
      return diffString
    },
  },
  async mounted() {
    emitter.emit("presentLoader")
    await this.getOrderDetail(this.orderId, this.orderPartSeqId, this.orderType);

    // fetch customer details and rejection reasons only when we get the orders information
    if(this.order.orderId) {
      await this.getCustomerContactDetails()
      await this.fetchRejectReasons();
    }
    emitter.emit("dismissLoader")
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      accessibilityOutline,
      bagCheckOutline,
      bagHandleOutline,
      bagRemoveOutline,
      callOutline,
      cashOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      checkmarkOutline,
      cubeOutline,
      currentFacility,
      downloadOutline,
      getProductIdentificationValue,
      giftOutline,
      getFeature,
      hasPermission,
      informationCircleOutline,
      locateOutline,
      printOutline,
      productIdentificationPref,
      pulseOutline,
      router,
      store,
      sunnyOutline,
      ticketOutline,
      timeOutline,
      mailOutline,
      sendOutline,
      translate
    };
  }
});
</script>

<style scoped>
.border-top {
  border-top: 1px solid #ccc;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

@media (min-width: 768px) {
  main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacer-base);
    max-width: 1200px;
    margin-inline: auto;
    margin-top: var(--spacer-xl);
  }

  aside {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>