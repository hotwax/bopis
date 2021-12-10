<template>
  <ion-card>
    <ion-list>
      <ion-item @click="viewProduct(order)" lines="none">
        <ion-label>
          <h1>{{ order.customerName }}</h1>
          <p>{{ order.customerId }}</p>
        </ion-label>
        <ion-note>
          <p>{{ order.orderDate && $filters.formatDate(order.orderDate) }}</p>
          <slot name="packedTime">
            <!-- TODO: Display the packed date of the orders, currently not getting the packed date from API-->
            <p></p>
          </slot>
        </ion-note>
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
    </ion-list>
    <div class="border-top">
      <slot name="cardActionButton" />
    </div>       
  </ion-card>
</template>

<script lang="ts">
import { IonCard, IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon } from "@ionic/vue";
import ProductListItem from './ProductListItem.vue'
import { callOutline, mailOutline } from "ionicons/icons";
import { defineComponent } from "vue"
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import {useRouter} from 'vue-router'
import { useStore } from "vuex";
import emitter from "@/event-bus";

const { Clipboard } = Plugins;

export default defineComponent({
  name: 'OrderItemCard',
  components: {
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    ProductListItem
  },
  props: ["order", "shipGroup"],
  methods: {
    async copyToClipboard(text: string) {
      await Clipboard.write({
        string: text
      }).then(() => {
        showToast(this.$t('Copied'))
      })
    },
    async viewProduct (order: any) {
      emitter.emit("setCurrent", order);
    },
    getShipGroupItems(shipGroupSeqId: any, items: any) {
      // To get all the items of same shipGroup, further it will use on pickup-order-card component to display line items
      return items.filter((item: any) => item.shipGroupSeqId == shipGroupSeqId)
    },
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return {
      callOutline,
      mailOutline,
      router,
      store,
    }
  }
})
</script>

<style>
.border-top{
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>