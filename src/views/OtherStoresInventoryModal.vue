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
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchFacilities()"/>
    <ion-list v-if="filteredInventory.length">
      <ion-item v-for="details in filteredInventory" :key="details.facilityName">
        <ion-label class="ion-text-wrap">{{ details.facilityName }}</ion-label>
        <ion-note slot="end">{{ translate('ATP', { count: details.stock}) }}</ion-note>
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
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
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
    IonSearchbar,
    IonTitle,
    IonToolbar 
  },
  props: ["otherStoresInventory"],
  data() {
    return{
      queryString: "",
      filteredInventory: [] as any
    }
  },
  mounted() {
    // Create a copy of otherStoresInventory on mount
    this.filteredInventory = this.otherStoresInventory.slice();
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    searchFacilities(){
      if (this.queryString !== "") {
        this.filteredInventory = this.otherStoresInventory.filter((facility: any) => facility.facilityName.toLowerCase().includes(this.queryString.toLowerCase()));
      } else {
        // Reset filteredInventory when query is empty
        this.filteredInventory = this.otherStoresInventory.slice(); 
      }
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