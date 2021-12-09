<template>
  <ion-header>
    <ion-toolbar>
      <ion-back-button default-href="/" slot="start" />
      <ion-title>{{ $t("Order details") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
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

    <ion-card>
      <ion-card-content>
        <ion-item lines="full">
          <ion-thumbnail slot="start">
            <Image :src="orders.items[0].images.main.thumbnail" />
          </ion-thumbnail>
          <ion-label>
            <h5>BRAND</h5>
            <h2>{{ orders.items[0].itemName }}</h2>
            <p>
              {{ $t("Color") }} : {{ orders.items[0].standardFeatures.COLOR.description }}
            </p>
            <p>
              {{ $t("Size") }} :{{ orders.items[0].standardFeatures.SIZE.description }}
            </p>
          </ion-label>
          <ion-note slot="end" color="warning">
            {{ $t("In Stock", { count: orders.items[0].inventory[0].quantity }) }}
          </ion-note>
        </ion-item>
      </ion-card-content>
    </ion-card>
    <ion-item lines="none">
      <ion-note>
        {{ $t("This order cannot be split. If you cannot fulfill any item, customer name will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.") }}
      </ion-note>
    </ion-item>
    <ion-button expand="block" color="danger" fill="outline">
      {{ $t("Reject Order") }}
    </ion-button>
    <ion-card>
      <ion-item lines="none">
        <ion-icon :icon="informationCircleOutline" slot="start" />
        <ion-label>{{ $t("Learn more about unfillable items") }}</ion-label>
      </ion-item>
    </ion-card>
  </ion-content>
</template>

<script>
import {
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
  IonThumbnail,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { Plugins } from "@capacitor/core";
import { mapGetters } from "vuex";
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
  informationCircleOutline,
} from "ionicons/icons";
import Image from "@/components/Image.vue";
import { showToast } from "@/utils";

const { Clipboard } = Plugins;

export default defineComponent({
  name: "OrderDetail",
  components: {
    Image,
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
    IonThumbnail,
    IonToolbar,
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
  },
  setup() {
    return {
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
