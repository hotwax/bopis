<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="!order?.orderId || order?.rejected" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="orderType === 'open'" class="ion-hide-md-up" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" @click="rejectOrder()">
            <ion-icon slot="icon-only" color="danger" :icon="bagRemoveOutline" />
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
          <ion-item v-if="order?.readyToHandover || order?.rejected" color="light" lines="none">
            <ion-icon :icon="order.readyToHandover ? checkmarkCircleOutline : closeCircleOutline" :color="order.readyToHandover ? 'success' : 'danger'" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.readyToHandover ? translate("Order is now ready to handover.") : translate("Order has been rejected.") }}</ion-label>
          </ion-item>
          <ion-item v-if="order?.handovered || order?.shipped" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.handovered ? translate("Order is successfully handed over to customer.") : translate("Order is successfully shipped.") }}</ion-label>
          </ion-item>
          <ion-list>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h2>{{ order?.customer?.name }}</h2>
                <p>{{ order?.orderName ? order?.orderName : order?.orderId }}</p>
              </ion-label>
              <ion-badge v-if="order?.placedDate" slot="end">{{ timeFromNow(order.placedDate) }}</ion-badge>
            </ion-item>
          </ion-list>
          <ion-item v-if="customerEmail" lines="none">
            <ion-icon :icon="mailOutline" slot="start" />
            <ion-label>{{ customerEmail }}</ion-label>
            <ion-button fill="clear" @click="copyToClipboard(customerEmail)">
              <ion-icon color="medium" :icon="copyOutline"/>
            </ion-button>
          </ion-item>
          <ion-item v-if="order?.shippingInstructions" color="light" lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ translate("Handling Instructions") }}</p>
              <p>{{ order.shippingInstructions }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="orderType === 'packed'" lines="none">
            <ion-label class="ion-text-wrap">
              {{ translate("Picked by", { pickers: order.pickers }) }}
            </ion-label>
          </ion-item>
          <div v-if="orderType === 'open'" class="ion-margin-top ion-hide-md-down">
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" @click.stop="readyForPickup(order, order.part)">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Order") }}
            </ion-button>
          </div>

          <div v-if="orderType === 'packed'" class="ion-margin-top ion-hide-md-down">
            <!-- TODO: implement functionality to change shipping address -->
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.handovered || order?.shipped" expand="block" fill="outline" @click.stop="order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? sendReadyForPickupEmail(order) : ''">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Resend customer email") : translate("Generate shipping documents") }}
            </ion-button>
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.handovered || order?.shipped" expand="block" @click.stop="deliverShipment(order)">
              {{ order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
          </div>
        </aside>
        <section>
          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ProductListItem :item="item" />
            <!-- Checking for true as a string as the settingValue contains a string and not boolean-->
            <div v-if="partialOrderRejectionConfig?.settingValue == 'true' && orderType === 'open'" class="border-top">
              <ion-button fill="clear" @click="openReportAnIssueModal(item)">
                {{ translate("Report an issue") }}
              </ion-button>
            </div>
          </ion-card>
        </section>
      </main>

      <ion-fab v-if="order?.orderId && orderType === 'open'" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" @click="readyForPickup(order, order.part)">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected">
          <ion-icon :icon="bagHandleOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-fab v-else-if="order?.orderId && orderType === 'packed'" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" @click="deliverShipment(order)">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.handovered || order?.shipped">
          <ion-icon :icon="order.part.shipmentMethodEnum.shipmentMethodEnumId === 'STOREPICKUP' ? accessibilityOutline : checkmarkOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonLabel,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  accessibilityOutline,
  copyOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  mailOutline,
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
import { copyToClipboard, showToast } from '@/utils'
import { DateTime } from "luxon";
import { hasError } from '@/adapter';
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { OrderService } from "@/services/OrderService";
import RejectOrderModal from "@/components/RejectOrderModal.vue";
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "OrderDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonPage,
    IonLabel,
    IonTitle,
    IonToolbar,
    ProductListItem,
    IonFab,
    IonFabButton,
  },
  data() {
    return {
      customerEmail: '',
      orderType: this.$route.params.orderType
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      currentFacility: 'user/getCurrentFacility',
      configurePicker: "user/configurePicker",
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig'
    })
  },
  methods: {
    async assignPicker(order: any, part: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId }
      });
      return assignPickerModal.present();
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
      if(orderType !== 'open' && orderType !== 'packed') {
        this.store.dispatch('order/updateCurrent', { order: {} })
        return;
      }

      const payload = {
        facilityId: this.currentFacility.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", { payload, orderType })
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
    async shipToCustomer() {
      const shipmodal = await modalController.create({
        component: ShipToCustomerModal,
      });
      return shipmodal.present();
    },
    async getCustomerContactDetails() {
      try {
        const resp = await OrderService.getCustomerContactDetails(this.$route.params.orderId)
        if (!hasError(resp)) {
          this.customerEmail = resp.data.orderContacts.email.email
        }
      } catch (error) {
        console.error(error)
      }
    },
    async sendReadyForPickupEmail(order: any) {
      const header = translate('Resend ready for pickup email')
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
                console.error(error)
              }
            }
          }]
        });
      return alert.present();
    },
  },
  async mounted() {
    await this.getOrderDetail(this.$route.params.orderId, this.$route.params.orderPartSeqId, this.$route.params.orderType);

    // fetch customer details and rejection reasons only when we get the orders information
    if(this.order.orderId) {
      await this.getCustomerContactDetails()
      await this.fetchRejectReasons();
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      accessibilityOutline,
      bagHandleOutline,
      bagRemoveOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      hasPermission,
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

@media (min-width: 768px) {
  main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacer-base);
  }

  aside {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>