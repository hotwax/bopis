<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Other stores inventory") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <ion-list v-if="otherStoresInventory.length">
      <ion-item v-for="details in otherStoresInventory" :key="details.facilityName">
        <ion-label class="ion-text-wrap">{{ details.facilityName }}</ion-label>
        <ion-note slot="end">{{ details.stock }}</ion-note>
      </ion-item>
    </ion-list>
    <div v-else class="ion-text-center">
      <p>{{ translate("No inventory details found")}}</p>
    </div>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { close } from "ionicons/icons";
import { useStore } from "@/store";
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: "OtherStoresInventoryModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar 
  },
  props: ["otherStoresInventory"],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  setup() {
    const store = useStore();
    return {
      close,
      store,
      translate
    };
  }
});
</script>