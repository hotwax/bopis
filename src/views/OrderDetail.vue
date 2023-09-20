<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="orderItemRejectionHistory()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="!isDesktop" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" @click="updateOrder(order)">
            <ion-icon slot="icon-only" color="danger" :icon="bagRemoveOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-grid :fixed="true">
        <ion-row>
          <ion-col push-md="6">
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

            <!-- TODO: implement functionality to change shipping address -->
            <!-- <ion-button expand="block" fill="outline" @click="shipToCustomer()">
              {{ $t("Ship to customer") }}
              <ion-icon :icon="sendOutline" slot="end" />
            </ion-button> -->
            <ion-button v-if="isDesktop" class="ion-margin-top" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" expand="block">
              {{ $t("Ready for pickup") }}
            </ion-button>
            <ion-button v-if="isDesktop" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" expand="block" color="danger" fill="outline" @click="updateOrder(order)">
              {{ $t("Reject Order") }}
            </ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("If you cannot fulfill this order, will be sent an email and the order item will be removed from your dashboard.", { customerName: order.customer.name ? order.customer.name : '' }) }}</p>
              </ion-label>
            </ion-item>
          </ion-col>
          <ion-col pull-md="6">
            <section :class="{ 'order-items': isDesktop }">
            <ion-card v-for="(item, index) in getCurrentOrderPart()?.items" :key="index">
              <ProductListItem :item="item" />
              <ion-item lines="none" class="border-top">
                <ion-button fill="clear">
                  {{ $t("Report an issue") }}
                </ion-button>
                <!-- <ion-label>{{ $t("Reason") }}</ion-label>
                <ion-select multiple="false" v-model="item.reason">
                  <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ $t(reason.label) }}</ion-select-option>
                </ion-select> -->
              </ion-item>
            </ion-card>
            <ion-card v-for="(item, index) in getCurrentOrderPart()?.items" :key="index">
              <ProductListItem :item="item" />
              <ion-item lines="none" class="border-top">
                <ion-button fill="clear">
                  {{ $t("Report an issue") }}
                </ion-button>
                <!-- <ion-label>{{ $t("Reason") }}</ion-label>
                <ion-select multiple="false" v-model="item.reason">
                  <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ $t(reason.label) }}</ion-select-option>
                </ion-select> -->
              </ion-item>
            </ion-card>
            <ion-card v-for="(item, index) in getCurrentOrderPart()?.items" :key="index">
              <ProductListItem :item="item" />
              <ion-item lines="none" class="border-top">
                <ion-button fill="clear">
                  {{ $t("Report an issue") }}
                </ion-button>
                <!-- <ion-label>{{ $t("Reason") }}</ion-label>
                <ion-select multiple="false" v-model="item.reason">
                  <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ $t(reason.label) }}</ion-select-option>
                </ion-select> -->
              </ion-item>
            </ion-card>
          </section>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-fab v-if="!isDesktop" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)">
          <ion-icon :icon="bagHandleOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script>
import {
  alertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar,
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
import ProductListItem from '@/components/ProductListItem.vue'
import { copyToClipboard } from '@/utils'
import { hasError } from '@/adapter';
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon';
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { Actions, hasPermission } from '@/authorization'
import { OrderService } from "@/services/OrderService";
import OrderItemRejHistoryModal from './OrderItemRejHistoryModal.vue';

export default defineComponent({
  name: "OrderDetail",
  props: ['orderId'],
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonRow,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  data () {
    return {
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
      customerEmail: '',
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      currentFacility: 'user/getCurrentFacility',
    })
  },
  ionViewDidEnter() {
    setTimeout(() => {
      
      console.log('this.order -- ',this.order);
    }, 3000);
    if(this.order.items) this.order.items.map((item) => item['reason'] = this.unfillableReason[0].id);
  },
  methods: {
    timeFromNow (time) {
      const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async shipToCustomer() {
      const shipmodal = await modalController.create({
        component: ShipToCustomerModal,
      });
      return shipmodal.present();
    },
    async updateOrder (order) {
      const alert = await alertController
        .create({
          header: this.$t('Update Order'),
          message: this.$t(`This order will be removed from your dashboard. This action cannot be undone.`, { space: '<br /><br />' }),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Reject Order'),
            handler: () => {
              this.store.dispatch('order/setUnfillableOrderOrItem', { orderId: order.orderId, part: this.getCurrentOrderPart() }).then((resp) => {
                if (resp) this.router.push('/tabs/orders')
              })
            },
          }]
        });
      return alert.present();
    },
    async getOrderDetail(orderId, orderPartSeqId) {
      const payload = {
        facilityId: this.currentFacility.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", payload)
    },
    getCurrentOrderPart() {
      if (this.order.parts) {
        return this.order.parts.find((part) => part.orderPartSeqId === this.$route.params.orderPartSeqId)
      }
      return {}
    },
    async getCustomerContactDetails() {
      try {
        const resp = await OrderService.getCustomerContactDetails(this.$route.params.orderId)
        if (!hasError(resp)) {
          console.log('resp.data.orderContacts -', resp.data);
          this.customerEmail = resp.data.orderContacts.email.email
        }
      } catch (error) {
        console.error(error)
      }
    },
    async orderItemRejectionHistory() {
      const modal = await modalController
        .create({
          component: OrderItemRejHistoryModal
        })
      return modal.present();
    },
   },
  async mounted() {
    await this.getOrderDetail(this.$route.params.orderId, this.$route.params.orderPartSeqId);
    await this.getCustomerContactDetails()
  },
  setup () {
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
      timeOutline
    };
  }
});
</script>

<style scoped>
.border-top {
  border-top: 1px solid #ccc;
}

.order-items {
  height: calc(100vh - 81px);
  overflow-y: auto;
  /* Hide scrollbar for Firfox */
  scrollbar-width: none;
  /* Hide scrollbar for IE, Edge, and Safari */
  -ms-overflow-style: none;
}

/* Hide scrollbar for Chrome */
.order-items::-webkit-scrollbar {
  display: none;
}

</style>
