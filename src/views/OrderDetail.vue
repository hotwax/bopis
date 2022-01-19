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
            <p v-if="$filters.getOrderIdentificationId(order.orderIdentifications, orderIdentificationTypeId)">{{ $t('Order') }}: {{ $filters.getOrderIdentificationId(order.orderIdentifications, orderIdentificationTypeId) }}</p>
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

      <ion-card v-for="(item, index) in order?.items" :key="index">
        <ProductListItem :item="item" />
        <ion-item lines="none" class="border-top">
          <ion-label>{{ $t("Reason") }}</ion-label>
          <ion-select multiple="false" v-model="item.reason">
            <ion-select-option v-for="reason in unfillableReason" :value="reason.id" :key="reason.id">{{ $t(reason.label) }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-card>
      <ion-button expand="block" color="danger" fill="outline" @click="updateOrder(order)">
        {{ $t("Reject Order") }}
      </ion-button>
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
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
} from "ionicons/icons";
import ProductListItem from '@/components/ProductListItem.vue'
import { copyToClipboard } from '@/utils'
import { useRouter } from 'vue-router'
import * as moment from "moment-timezone";

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
      orderIdentificationTypeId: process.env.VUE_APP_ORD_IDENT_TYPE_ID
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
    })
  },
  ionViewDidEnter() {
    if(this.order.items) this.order.items.map((item) => item['reason'] = this.unfillableReason[0].id);
  },
  methods: {
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
              this.store.dispatch('order/setUnfillableOrderOrItem', order).then((resp) => {
                if (resp) this.router.push('/tabs/orders')
              })
            },
          }]
        });
      return alert.present();
    }
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
      swapVerticalOutline
    };
  }
});
</script>

<style scoped>
ion-thumbnail > img {
  object-fit: contain;
}
ion-select {
  max-width: 100%;
}

.border-top {
  border-top: 1px solid #ccc;
}
</style>
