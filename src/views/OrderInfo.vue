<template>
  <section>
    <ion-list>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <h2>{{ order.customer?.name }}</h2>
          <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
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
        <p>{{ order.shippingInstructions }}</p>
      </ion-label>
    </ion-item>

    <div class="actions" v-if="isDesktop">
      <!-- TODO: implement functionality to change shipping address -->
      <!-- <ion-button expand="block" fill="outline" @click="shipToCustomer()">
        {{ $t("Ship to customer") }}
        <ion-icon :icon="sendOutline" slot="end" />
      </ion-button> -->
      <ion-button class="ion-margin-top" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)"
        expand="block">
        {{ $t("Ready for pickup") }}
      </ion-button>
      <ion-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" expand="block"
        color="danger" fill="outline" @click="emitter.emit('updateOrder', order)">
        {{ $t("Reject Order") }}
      </ion-button>
    </div>
    <ion-item lines="none">
      <ion-label class="ion-text-wrap">
        <p>{{ $t("If you cannot fulfill this order, will be sent an email and the order item will be removed from your dashboard.", { customerName: order.customer.name ? order.customer.name : '' }) }}</p>
      </ion-label>
    </ion-item>
  </section>
</template>
  
<script>
import {
  alertController,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  modalController,
  isPlatform,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  bagHandleOutline,
  bagRemoveOutline,
  callOutline,
  copyOutline,
  mailOutline,
  sendOutline,
  swapVerticalOutline,
  timeOutline,
} from "ionicons/icons";
import { copyToClipboard } from '@/utils'
import { hasError } from '@/adapter';
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon';
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { Actions, hasPermission } from '@/authorization'
import { OrderService } from "@/services/OrderService";
import OrderItemRejHistoryModal from './OrderItemRejHistoryModal.vue';
import emitter from "@/event-bus";

export default defineComponent({
  name: "OrderInfo",
  props: ['orderId', 'orderPartSeqId'],
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
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
      customerEmail: '',
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent"
    })
  },
  methods: {
    timeFromNow(time) {
      const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async shipToCustomer() {
      const shipmodal = await modalController.create({
        component: ShipToCustomerModal,
      });
      return shipmodal.present();
    },
    getCurrentOrderPart() {
      if (this.order.parts) {
        return this.order.parts.find((part) => part.orderPartSeqId === this.orderPartSeqId)
      }
      return {}
    },
    async getCustomerContactDetails() {
      try {
        const resp = await OrderService.getCustomerContactDetails(this.orderId)
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
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      bagHandleOutline,
      bagRemoveOutline,
      callOutline,
      copyOutline,
      copyToClipboard,
      hasPermission,
      mailOutline,
      router,
      store,
      swapVerticalOutline,
      sendOutline,
      timeOutline,
      emitter
    };
  }
});
</script>
  
<style scoped>
.actions {
  display: flex;
  flex-direction: column;
}
</style>
  