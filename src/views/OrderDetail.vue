<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button default-href="home"></ion-back-button>
      </ion-buttons>
      <ion-title>{{ $t("Order details") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label>
          <h2>Customer name</h2>
          <p>Order ID</p>
        </ion-label>
        <ion-note slot="end">order time delta</ion-note>
      </ion-item>
    </ion-list>
    <ion-item>
      <ion-icon :icon="callOutline" slot="start"></ion-icon>
      <ion-label>Phone Number</ion-label>
      <ion-button fill="outline" slot="end" color="medium">
        {{$t ("Copy") }}
        </ion-button>
    </ion-item>
    <ion-item lines="none">
      <ion-icon :icon="mailOutline" slot="start"></ion-icon>
      <ion-label>Email</ion-label>
      <ion-button fill="outline" slot="end" color="medium">
        {{ $t( "Copy") }}
        </ion-button>
    </ion-item>
    <!-- Card -->
    <ion-card>
      <ion-card-content class="border-bottom">
        <ion-item lines="full">
          <ion-thumbnail slot="start">
            <Image :src="'data:image/jpeg;base64,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'"/>
          </ion-thumbnail>
          <ion-label>
            <h5>BRAND</h5>
            <h2>Virtual Name</h2>
            <p>{{ $t("Color") }} : color</p>
            <p>{{ $t("Size") }} : size</p>
          </ion-label>
          <ion-note slot="end" color="warning">15 {{ $t("In Stock") }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start" color="primary"> </ion-checkbox>
          <ion-label>{{ $t("UnFillable") }} </ion-label>
          <ion-select value="Not in stock">
            <ion-select-option>{{ $t("Not in stock") }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-card-content>
    </ion-card>
   <ion-text>
      <p>
        {{ $t("This order cannot be split. If you cannot fulfill any item, customer name will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.") }}
      </p>
    </ion-text>
    <ion-button expand="block" color="danger" fill="outline">
      {{ $t("REJECT ORDER") }}
      </ion-button>
    <ion-card>
      <ion-item lines="none">
        <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
        <ion-label>{{ $t(" Learn more about unfillable items") }}</ion-label>
      </ion-item>
    </ion-card>
  </ion-content>
</template>

<script>
import {
  IonButton,
  IonBackButton,
  IonButtons,
  IonCard,
  IonContent,
  IonCheckbox,
  IonCardContent,
  IonHeader,
  IonItem,
  IonIcon,
  IonList,
  IonLabel,
  IonNote,
  IonSelectOption,
  IonSelect,
  IonThumbnail,
  IonToolbar,
  IonTitle,
  IonText,
 
} from "@ionic/vue";
import { defineComponent } from "vue";
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
  informationCircleOutline,
} from "ionicons/icons";
import Image from "@/components/Image.vue";

export default defineComponent({
  name: "OrderDetail",
  components: {
  Image, 
  IonButton,
  IonBackButton,
  IonButtons,
  IonCard,
  IonContent,
  IonCheckbox,
  IonCardContent,
  IonHeader,
  IonItem,
  IonIcon,
  IonList,
  IonLabel,
  IonNote,
  IonSelectOption,
  IonSelect,
  IonThumbnail,
  IonToolbar,
  IonTitle,
  IonText,
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
