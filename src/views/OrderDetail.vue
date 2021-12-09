<template>
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
          <h2>{{ orders.customerName }}</h2>
          <p>{{ orders.orderId }}</p>
        </ion-label>
        <ion-note slot="end">{{ $filters.formatDate(orders.orderDate) }}</ion-note>
      </ion-item>
    </ion-list>
    <ion-item v-if="orders.phoneNumber">
      <ion-icon :icon="callOutline" slot="start" />
      <ion-label>{{ orders.phoneNumber }}</ion-label>
      <ion-button
        fill="outline"
        slot="end"
        color="medium"
        @click="copyToClipboard(orders.phoneNumber)"
      >
        {{ $t("Copy") }}
      </ion-button>
    </ion-item>
    <ion-item v-if="orders.email" lines="none">
      <ion-icon :icon="mailOutline" slot="start" />
      <ion-label>{{ orders.email }}</ion-label>
      <ion-button
        fill="outline"
        slot="end"
        color="medium"
        @click="copyToClipboard(orders.email)"
      >
        {{ $t("Copy") }}
      </ion-button>
    </ion-item>

    <ion-card v-for="(item, index) in orders?.items" :key="index">
      <ion-card-content>
        <ProductListItem :item="item" />
      </ion-card-content>
    </ion-card>
    <ion-item lines="none">
      <ion-note>
        {{ $t("This order cannot be split. If you cannot fulfill any item, customer name will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.") }}
      </ion-note>
    </ion-item>
    <ion-button expand="block" color="danger" fill="outline" @click="updateOrder(orders)">
      {{ $t("Reject Order") }}
    </ion-button>
    <ion-card>
      <ion-item lines="none">
        <ion-icon :icon="informationCircleOutline" slot="start" @click="learnMore"/>
        <ion-label>{{ $t("Learn more about unfillable items") }}</ion-label>
      </ion-item>
    </ion-card>
  </ion-content>
</template>

<script>
import {
  alertController,
  IonBackButton,
  IonButton,
  IonCard,
  IonContent,
  IonCardContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { Plugins } from "@capacitor/core";
import { mapGetters, useStore } from "vuex";
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
  informationCircleOutline,
} from "ionicons/icons";
import { showToast } from "@/utils";
import ProductListItem from '@/components/ProductListItem.vue'

const { Clipboard } = Plugins;

export default defineComponent({
  name: "OrderDetail",
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonContent,
    IonCardContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  computed: {
    ...mapGetters({
      orders: "orders/getCurrent",
    }),
  },
  methods: {
    async copyToClipboard(text) {
      await Clipboard.write({
        string: text,
      }).then(() => {
        showToast("Copied");
        console.log("text", text);
      });
    },
    async updateOrder (order) {
      const alert = await alertController
        .create({
          header: this.$t('Update Order'),
          message: `${order.customerName} will be sent an email with alternate fulfillment options for their BOPIS order and this order will be removed from your dashboard.<br/><br/>This action cannot be undone.`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              handler: blah => {
                console.log('Confirm Cancel:', blah)
              },
            },
            {
              text: this.$t('Reject Order'),
              handler: () => {
                this.store.dispatch('orders/unfillableOrderOrItem', order);
              },
            },
          ],
        });
      return alert.present();
    },
    async learnMore () {
      const alert = await alertController
        .create({
          header: this.$t('Unfillable items'),
          message: this.$t('Depending on the reason you select for not fulfulling an item, an inventory variance will be recorded and all sales channels will be updated with new inventory levels.<br/><br/>For example, by selecting “Not in stock” HotWax Commerce will stop routing orders for it to your store and customers will not be able to place BOPIS orders for it at your store on Shopify.'),
          buttons: [
            {
              text: 'Dismiss',
              role: 'cancel'
            }
          ],
        });
      return alert.present();
    },
  },
  setup() {
    const store = useStore();

    return {
      store,
      swapVerticalOutline,
      callOutline,
      mailOutline,
      informationCircleOutline,
    };
  },
});
</script>
<style scoped>
ion-thumbnail > img {
  object-fit: contain;
}
ion-select {
  max-width: 100%;
}
</style>
