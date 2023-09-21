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
      <main :class="{ 'desktop-only' : isDesktop }">
        <OrderInfo v-if="!isDesktop" :orderId="$route.params.orderId" />
        <section>
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
        <aside v-if="isDesktop">
          <OrderInfo :orderId="$route.params.orderId" />
        </aside>
      </main>

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
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
  isPlatform,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  bagHandleOutline,
  bagRemoveOutline,
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
import OrderInfo from './OrderInfo';
import emitter from "@/event-bus"

export default defineComponent({
  name: "OrderDetail",
  props: ['orderId'],
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonPage,
    IonTitle,
    IonToolbar,
    ProductListItem,
    OrderInfo,
    IonFab,
    IonFabButton,
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
    if(this.order.items) this.order.items.map((item) => item['reason'] = this.unfillableReason[0].id);
  },
  methods: {
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
    async updateOrder(order) {
      console.log(order);
      const alert = await alertController
        .create({
          header: this.$t('Update Order'),
          message: this.$t(`This order will be removed from your dashboard. This action cannot be undone.`, { space: '<br /><br />' }),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          }, {
            text: this.$t('Reject Order'),
            handler: () => {
              this.store.dispatch('order/setUnfillableOrderOrItem', { orderId: order.orderId, part: this.getCurrentOrderPart() }).then((resp) => {
                if (resp) this.router.push('/tabs/orders')
              })
            },
          }]
        });
      return alert.present();
    }
   },
  async mounted() {
    await this.getOrderDetail(this.$route.params.orderId, this.$route.params.orderPartSeqId);
    emitter.on('updateOrder', this.updateOrder);
  },
  unmounted() {
    emitter.off('updateOrder', this.updateOrder);
  },
  setup () {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      bagHandleOutline,
      bagRemoveOutline,
      hasPermission,
      router,
      store,
      timeOutline
    };
  }
});
</script>

<style scoped>
.border-top {
  border-top: 1px solid #ccc;
}

main {
  max-width: 445px;
  margin: var(--spacer-base) auto 0; 
}

aside {
  position: sticky;
  top: var(--spacer-lg);
}

.desktop-only {
  display: flex;
  justify-content: center;
  align-items: start;
  gap: var(--spacer-2xl);
  max-width: 990px;
  margin: var(--spacer-base) auto 0;
}

.desktop-only > * {
  width: calc(50% - var(--spacer-xl));
}

.actions {
  display: flex;
  justify-content: space-between;
  margin: var(--spacer-base) var(--spacer-sm) var(--spacer-base);
}

</style>
