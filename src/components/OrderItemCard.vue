<template>
  <ion-card>
      <ion-item lines="none">
        <ion-label>
          <h1>{{ order.customerName }}</h1>
          <p v-if="$filters.getOrderIdentificationId(order.orderIdentifications, orderIdentificationTypeId)">{{ $t('Order') }}: {{ $filters.getOrderIdentificationId(order.orderIdentifications, orderIdentificationTypeId) }}</p>
        </ion-label>
        <ion-badge v-if="order.orderDate" color="dark" slot="end">{{ moment.utc(order.orderDate).fromNow() }}</ion-badge>
        <slot name="packedTime">
          <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
          <p></p>
        </slot>
      </ion-item>

      <ProductListItem v-for="item in getShipGroupItems(shipGroup, order.items)" :key="item.itemId" :item="item" />

      <ion-item v-if="order.phoneNumber">
        <ion-icon :icon="callOutline" slot="start" />
        <ion-label>{{ order.phoneNumber }}</ion-label>
        <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.phoneNumber)">
          {{ $t("Copy") }}
        </ion-button>
      </ion-item>
      <ion-item lines="full" v-if="order.email">
        <ion-icon :icon="mailOutline" slot="start" />
        <ion-label>{{ order.email }}</ion-label>
        <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.email)">
          {{ $t("Copy") }}
        </ion-button>
      </ion-item>
    <div class="border-top">
      <slot name="cardActionButton" />
    </div>       
  </ion-card>
</template>

<script lang="ts">
import { IonBadge, IonButton, IonCard, IonIcon, IonItem, IonLabel } from "@ionic/vue";
import ProductListItem from './ProductListItem.vue'
import { callOutline, mailOutline } from "ionicons/icons";
import { defineComponent } from "vue"
import { copyToClipboard } from '@/utils'
import { useRouter } from 'vue-router'
import { useStore } from "vuex";
import * as moment from "moment-timezone";

export default defineComponent({
  name: 'OrderItemCard',
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    ProductListItem
  },
  props: ["order", "shipGroup"],
  methods: {
    getShipGroupItems(shipGroupSeqId: any, items: any) {
      // To get all the items of same shipGroup, further it will use on pickup-order-card component to display line items
      return items.filter((item: any) => item.shipGroupSeqId == shipGroupSeqId)
    }
  },
  data () {
    return {
      orderIdentificationTypeId: process.env.VUE_APP_ORD_IDENT_TYPE_ID
    }
  },
  setup () {
    const router = useRouter();
    const store = useStore();

    return {
      callOutline,
      copyToClipboard,
      mailOutline,
      moment,
      router,
      store,
    }
  }
})
</script>

<style>
.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
