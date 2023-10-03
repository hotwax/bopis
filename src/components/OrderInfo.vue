<template>
  <section class="orderHeader">
    <ion-item v-if="order?.readyToHandover || order?.rejected" color="light" lines="none">
      <ion-icon :icon="order?.readyToHandover ? checkmarkCircleOutline : order?.rejected ? closeCircleOutline : ''" :color="order?.readyToHandover ? 'success' : order?.rejected ? 'danger' : ''" slot="start" />
      <ion-label class="ion-text-wrap">{{ order?.readyToHandover ? $t("Order is now ready to handover.") : order?.rejected ? $t("Order has been rejected.") : '' }}</ion-label>
    </ion-item>
    <ion-list>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>{{ order?.customer?.name }}</h2>
          <p>{{ order?.orderName ? order?.orderName : order?.orderId }}</p>
        </ion-label>
        <ion-badge v-if="order.placedDate" slot="end">{{ timeFromNow(order.placedDate) }}</ion-badge>
      </ion-item>
    </ion-list>
    <ion-item v-if="customerEmail" lines="none">
      <ion-icon :icon="mailOutline" slot="start" />
      <ion-label>{{ customerEmail }}</ion-label>
      <ion-icon :icon="copyOutline" slot="end" @click="copyToClipboard(customerEmail)" />
    </ion-item>
    <ion-item v-if="order.shippingInstructions" color="light" lines="none">
      <ion-label class="ion-text-wrap">
        <p class="overline">{{ $t("Handling Instructions") }}</p>
        <p>{{ order?.shippingInstructions }}</p>
      </ion-label>
    </ion-item>
    <div class="ion-margin-top ion-hide-md-down">
      <!-- TODO: implement functionality to change shipping address -->
      <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" @click.stop="emitter.emit('readyForPickupOfOrderDetail', { order, part: order.part })">
        {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}
      </ion-button>
      <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" expand="block" color="danger" fill="outline" @click="emitter.emit('updateOrder', order)">
        {{ $t("Reject Order") }}
      </ion-button>
    </div>
  </section>
</template>
  
<script lang="ts">
import {
  isPlatform,
  IonBadge,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  modalController,
} from "@ionic/vue";
import {
  copyOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  mailOutline,
  sendOutline
} from "ionicons/icons";
import { defineComponent } from "vue";
import { mapGetters } from 'vuex'
import { copyToClipboard } from '@/utils'
import { hasError } from '@/adapter';
import { DateTime } from 'luxon';
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { Actions, hasPermission } from '@/authorization'
import { OrderService } from "@/services/OrderService";
import emitter from "@/event-bus";

export default defineComponent({
  name: "OrderInfo",
  components: {
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonBadge
  },
  data() {
    return {
      customerEmail: '',
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      order: "order/getCurrent"
    })
  },
  methods: {
    timeFromNow(time: string) {
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
    await this.getCustomerContactDetails()
  },
  setup() {

    return {
      Actions,
      emitter,
      checkmarkCircleOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      hasPermission,
      mailOutline,
      sendOutline
    };
  }
});
</script>
  