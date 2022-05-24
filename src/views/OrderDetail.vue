<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Order details") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item lines="none">
          <ion-label>
            <h2>{{ order.customerName }}</h2>
            <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
          </ion-label>
          <ion-badge v-if="order.orderDate" color="dark" slot="end">{{ moment.utc(order.orderDate).fromNow() }}</ion-badge>
        </ion-item>
      </ion-list>
      <ion-item v-if="order.phoneNumber">
        <ion-icon :icon="callOutline" slot="start" />
        <ion-label>{{ order.phoneNumber }}</ion-label>
        <ion-button
          fill="outline"
          slot="end"
          color="medium"
          @click="copyToClipboard(order.phoneNumber)"
        >
          {{ $t("Copy") }}
        </ion-button>
      </ion-item>
      <ion-item v-if="order.email" lines="none">
        <ion-icon :icon="mailOutline" slot="start" />
        <ion-label>{{ order.email }}</ion-label>
        <ion-button
          fill="outline"
          slot="end"
          color="medium"
          @click="copyToClipboard(order.email)"
        >
          {{ $t("Copy") }}
        </ion-button>
      </ion-item>
  
    <main>
      <ion-card v-for="(item, index) in order?.items" :key="index">
        <ProductListItem :item="item" />
        <ion-item lines="none" class="border-top">
          <ion-label>{{ $t("Reason") }}</ion-label>
          <ion-select multiple="false" v-model="item.reason">
            <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ $t(reason.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-card>

      <ion-button expand="block" fill="outline" @click="shipToCustomer()">
        {{ $t("Ship to customer") }}
        <ion-icon :icon="sendOutline" slot="end" />
      </ion-button>

      <ion-button expand="block" color="danger" fill="outline" @click="updateOrder(order)">
        {{ $t("Reject Order") }}
      </ion-button>
    </main>  
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
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  sendOutline,
  swapVerticalOutline,
  callOutline,
  mailOutline,
} from "ionicons/icons";
import ProductListItem from '@/components/ProductListItem.vue'
import { copyToClipboard, showToast } from '@/utils'
import { useRouter } from 'vue-router'
import * as moment from "moment-timezone";
import ShipToCustomerModal from "@/components/ShipToCustomerModal.vue";
import { translate } from "@/i18n";
import { OrderService } from "@/services/OrderService";
import emitter from "@/event-bus"

export default defineComponent({
  name: "OrderDetail",
  props: ['orderId'],
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  data () {
    return {
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
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
    async shipToCustomer() {
      const shipmodal = await modalController.create({
        component: ShipToCustomerModal,
      });
      return shipmodal.present();
    },
    async updateOrder (data) {
      const alert = await alertController
        .create({
          header: this.$t('Update Order'),
          message: this.$t(`This order will be removed from your dashboard. This action cannot be undone.`, { space: '<br /><br />' }),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Reject Order'),
            handler: async () => {
              
              emitter.emit("presentLoader");
              
              const payload = {
                'orderId': data.orderId
              }

              await Promise.all(data.items.map((item) => {
                const params = {
                  ...payload,
                  'rejectReason': item.reason,
                  'facilityId': item.facilityId,
                  'orderItemSeqId': item.orderItemSeqId,
                  'shipmentMethodTypeId': item.shipmentMethodTypeId,
                  'quantity': parseInt(item.quantity)
                }
                OrderService.rejectOrderItem({'payload': params}).catch((err) => { 
                  return err;
                })
              })).then((resp) => {
                const refreshPickupOrders = resp.find((response) => !(response.data._ERROR_MESSAGE_ || response.data._ERROR_MESSAGE_LIST_))
                if (refreshPickupOrders) {
                  showToast(translate('All items were canceled from the order') + ' ' + payload.orderId);
                } else {
                  showToast(translate('Something went wrong'));
                }
                emitter.emit("dismissLoader");
                return resp;
              }).catch(err => err).then((resp)=>{
              if (resp) this.router.push('/tabs/orders')
            });
            },
          }]
        });
      return alert.present();
    },
    async getOrderDetail(orderId) {
      const payload = {
        facilityId: this.currentFacility.facilityId,
        orderId
      }
      await this.store.dispatch("order/getOrderDetail", payload)
    }
  },
  mounted() {
    this.getOrderDetail(this.$route.params.orderId);
  },
  setup () {
    const store = useStore();
    const router = useRouter();

    return {
      callOutline,
      copyToClipboard,
      mailOutline,
      moment,
      router,
      store,
      swapVerticalOutline,
      sendOutline
    };
  }
});
</script>

<style scoped>
main {
  max-width: 445px;
  margin: var(--spacer-base) auto 0; 
}

.border-top {
  border-top: 1px solid #ccc;
}
</style>
