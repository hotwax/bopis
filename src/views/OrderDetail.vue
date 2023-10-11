<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="order?.rejected" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button class="ion-hide-md-up" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" @click="rejectOrder(order)">
            <ion-icon slot="icon-only" color="danger" :icon="bagRemoveOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <aside>
          <ion-item v-if="order?.readyToHandover || order?.rejected" color="light" lines="none">
            <ion-icon :icon="order.readyToHandover ? checkmarkCircleOutline : closeCircleOutline" :color="order.readyToHandover ? 'success' : 'danger'" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.readyToHandover ? $t("Order is now ready to handover.") : $t("Order has been rejected.") }}</ion-label>
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
            <ion-icon :icon="copyOutline" slot="end" @click="copyToClipboard(customerEmail)" />
          </ion-item>
          <ion-item v-if="order?.shippingInstructions" color="light" lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ $t("Handling Instructions") }}</p>
              <p>{{ order.shippingInstructions }}</p>
            </ion-label>
          </ion-item>
          <div class="ion-margin-top ion-hide-md-down">
            <!-- TODO: implement functionality to change shipping address -->
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" @click.stop="readyForPickup(order, order.part)">
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}
            </ion-button>
            <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" color="danger" fill="outline" @click="rejectOrder(order)">
              {{ $t("Reject Order") }}
            </ion-button>
          </div>
        </aside>
        <section>
          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ProductListItem :item="item" />
            <div v-if="partialOrderRejection" class="border-top">
              <ion-button fill="clear" @click="openReportAnIssueModal(item)">
                {{ $t("Report an issue") }}
              </ion-button>
            </div>
          </ion-card>
        </section>
      </main>

      <ion-fab class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" @click="readyForPickup(order, order.part)">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected">
          <ion-icon :icon="bagHandleOutline" />
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
  copyOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
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
import { copyToClipboard } from '@/utils'
import { DateTime } from "luxon";
import { hasError } from '@/adapter';
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { OrderService } from "@/services/OrderService";
import RejectOrderModal from "@/components/RejectOrderModal.vue";

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
      customerEmail: ''
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      currentFacility: 'user/getCurrentFacility',
      configurePicker: "user/configurePicker",
      partialOrderRejection: 'user/partialOrderRejection'
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
    async getOrderDetail(orderId: any, orderPartSeqId: any) {
      const payload = {
        facilityId: this.currentFacility.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", payload)
    },
    async rejectOrder(order: any) {
      const rejectOrderModal = await modalController.create({
        component: RejectOrderModal
      });
      return rejectOrderModal.present();
    },
    async readyForPickup(order: any, part: any) {
      if (this.configurePicker) return this.assignPicker(order, part, this.currentFacility.facilityId);
      const pickup = part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP';
      const header = pickup ? this.$t('Ready for pickup') : this.$t('Ready to ship');
      const message = pickup ? this.$t('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customer.name, space: '<br/><br/>' }) : '';

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
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
    }
  },
  async mounted() {
    await this.getOrderDetail(this.$route.params.orderId, this.$route.params.orderPartSeqId);
    await this.getCustomerContactDetails()
    await this.fetchRejectReasons();
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      bagHandleOutline,
      bagRemoveOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      checkmarkCircleOutline,
      hasPermission,
      router,
      store,
      timeOutline,
      mailOutline,
      sendOutline
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