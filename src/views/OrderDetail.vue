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
          <ion-button v-else-if="orderType === 'packed' && showPackingSlip" :class="order.part?.shipmentMethodEnum?.shipmentMethodEnumId !== 'STOREPICKUP' ? 'ion-hide-md-up' : ''" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? printPackingSlip(order) : printShippingLabelAndPackingSlip(order)">
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
          <!-- Order Status -->
          <ion-item v-if="order.readyToHandover || order.readyToShip" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.readyToHandover ? translate("Order is now ready to handover.") : translate("Order is now ready to be shipped.") }}</ion-label>
          </ion-item>
          <ion-item v-else-if="order.rejected" color="light" lines="none">
            <ion-icon :icon="closeCircleOutline" color="danger" slot="start" />
            <ion-label class="ion-text-wrap">{{ translate("Order has been rejected.") }}</ion-label>
          </ion-item>

          <ion-item v-if="order.handovered || order.shipped" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.handovered ? translate("Order is successfully handed over to customer.") : translate("Order is successfully shipped.") }}</ion-label>
          </ion-item>

          <!-- Order Details -->
          <ion-row class="order-header ion-justify-content-between ion-wrap ion-align-items-center">
            <h1>{{ order?.orderName ? order?.orderName : order?.orderId }}</h1>
            <ion-chip outline v-if="order?.orderPaymentPreferences" :color="statusColor[order?.orderPaymentPreferences[0]?.statusId]">
              <ion-icon :icon="cashOutline"/>
              <ion-label>{{ getPaymentMethodDesc(order?.orderPaymentPreferences[0]?.paymentMethodTypeId)}} : {{ getStatusDesc(order?.orderPaymentPreferences[0]?.statusId) }}</ion-label>
            </ion-chip>
          </ion-row>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                {{ order?.customer?.name }}
              </ion-label>
              <ion-badge slot="end" v-if="order?.placedDate">{{ timeFromNow(order.placedDate) }}</ion-badge>
            </ion-item>
          </ion-list>
          <ion-item v-if="customerEmail" lines="none">
            <ion-icon :icon="mailOutline" slot="start" />
            <ion-label>{{ customerEmail }}</ion-label>
            <ion-button slot="end" fill="clear" @click="copyToClipboard(customerEmail, false)">
              <ion-icon color="medium" :icon="copyOutline"/>
            </ion-button>
          </ion-item>
          <ion-item v-if="order?.contactNumber" lines="none">
            <ion-icon :icon="callOutline" slot="start" />
            <ion-label>{{ order?.contactNumber }}</ion-label>
            <ion-button slot="end" fill="clear" @click="copyToClipboard(order?.contactNumber, false)">
              <ion-icon color="medium" :icon="copyOutline"/>
            </ion-button>
          </ion-item>
          <ion-item v-if="order?.shippingInstructions" color="light" lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ translate("Handling Instructions") }}</p>
              <p>{{ order.shippingInstructions }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="orderType === 'packed' && configurePicker && order.pickers" lines="none">
            <ion-label>
              {{ order.pickers ? translate("Picked by", { pickers: order.pickers }) : translate("No picker assigned.") }}
            </ion-label>
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" fill="outline" @click="editPicker(order)">
              {{ translate("Edit") }}
            </ion-button>
          </ion-item>
          <div v-if="orderType === 'open'" class="ion-margin-top ion-hide-md-down">
            <!-- TODO: implement functionality to change shipping address -->
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" expand="block" @click="readyForPickup(order, order.part)">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button class="ion-margin-top" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" expand="block" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Order") }}
            </ion-button>
            <p>
              {{ translate("If you cannot fulfill this order, will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.", { customerName: order?.customer?.name }) }}
            </p>
          </div>

          <div v-else-if="orderType === 'packed'" class="ion-margin-top ion-hide-md-down">
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" expand="block" fill="outline" @click="order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? sendReadyForPickupEmail(order) : printShippingLabelAndPackingSlip(order)">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Resend customer email") : translate("Generate shipping documents") }}
            </ion-button>
            <ion-button class="ion-margin-top" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" expand="block" @click="deliverShipment(order)">
              {{ order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
          </div>
        </aside>
        <section>
          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ProductListItem :item="item" />
            <!-- Checking for true as a string as the settingValue contains a string and not boolean-->
            <div v-if="orderType === 'open' && partialOrderRejectionConfig?.settingValue == 'true'" class="border-top">
              <ion-button :disabled="order?.readyToHandover || order.readyToShip || order?.rejected" fill="clear" @click="openReportAnIssueModal(item)">
                {{ translate("Report an issue") }}
              </ion-button>
            </div>
          </ion-card>
          <p v-if="!order.part?.items?.length" class="empty-state">{{ translate('All order items are rejected') }}</p>

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
                    <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">{{ shipGroup.category ? shipGroup.category : '-' }}</ion-badge>
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
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonLabel,
  IonNote,
  IonRow,
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
  checkmarkOutline,
  cubeOutline,
  giftOutline,
  informationCircleOutline,
  locateOutline,
  mailOutline,
  printOutline,
  sendOutline,
  bagHandleOutline,
  bagRemoveOutline,
  timeOutline
} from "ionicons/icons";
import ProductListItem from '@/components/ProductListItem.vue'
import { useRouter } from 'vue-router'
import { Actions, hasPermission } from '@/authorization'
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import ReportAnIssueModal from '@/components/ReportAnIssueModal.vue';
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { copyToClipboard, getFeature, showToast } from '@/utils'
import { DateTime } from "luxon";
import { api, hasError } from '@/adapter';
import { OrderService } from "@/services/OrderService";
import RejectOrderModal from "@/components/RejectOrderModal.vue";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
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
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonPage,
    IonLabel,
    IonNote,
    IonRow,
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
      currentFacility: 'user/getCurrentFacility',
      configurePicker: "user/configurePicker",
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      showPackingSlip: 'user/showPackingSlip',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPartyName: 'util/getPartyName',
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
        facilityId: this.currentFacility.facilityId,
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
      if (this.configurePicker) return this.assignPicker(order, part, this.currentFacility.facilityId);
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
              await this.store.dispatch('order/packShipGroupItems', { order: order, part: part, facilityId: this.currentFacility.facilityId })
            }
          }]
        });
      return alert.present();
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
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      Actions,
      accessibilityOutline,
      bagHandleOutline,
      bagRemoveOutline,
      callOutline,
      cashOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      cubeOutline,
      getProductIdentificationValue,
      giftOutline,
      getFeature,
      hasPermission,
      informationCircleOutline,
      locateOutline,
      printOutline,
      productIdentificationPref,
      router,
      store,
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