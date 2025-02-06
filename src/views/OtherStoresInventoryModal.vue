<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Other stores") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="sortByDistance">
          <ion-icon slot="icon-only" :icon="locationOutline"
            :color="activeSortType === 'distance' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
        <ion-button @click="sortByName">
          <ion-icon slot="icon-only" :icon="textOutline"
            :color="activeSortType === 'name' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
    <ion-searchbar v-model="queryString" placeholder="Search store name"
      @keyup.enter="queryString = $event.target.value; searchFacilities()" />
  </ion-header>
  <ion-content>
    <ion-list lines="full">
      <ion-item>
        <ion-label>Hide facilities without stock</ion-label>
        <ion-toggle @click="toggleHideEmptyStock" />
      </ion-item>
      <div v-if="ATPMappedStoresInventory.length">
        <ion-item v-for="inventory in ATPMappedStoresInventory" :key="inventory.storeCode">
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ inventory.storeCode }}</p>
            <h2>{{ inventory.storeName }}</h2>
            <ion-note>open</ion-note>
            <p v-if="typeof inventory.dist === 'number'">{{ inventory.dist }} miles</p>
          </ion-label>
          <ion-button fill="clear" slot="end">
            <ion-note slot="end">{{ translate('ATP', { count: inventory.stock }) }}</ion-note>
          </ion-button>
        </ion-item>
      </div>
      <div v-else class="ion-text-center">
        <p>{{ translate("No inventory details found")}}</p>
      </div>
    </ion-list>
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
import { computed, defineComponent } from "vue";
import { close, locationOutline, textOutline } from "ionicons/icons";
import { mapGetters } from "vuex";
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
  props: ["otherStoresInventory", "currentFacilityId"],
  data() {
    return {
      queryString: "",
      storesInventory: [] as any, // will be replaced
      ATPMappedStoresInventory: [] as any, // will be used.
      hideEmptyStores: false,
      activeSortType: "name",
    }
  },
  computed: {
    ...mapGetters({
      FacilityLatLon: 'util/getCurrentFacilityLatLon',
      storeLookupByLatLon: 'util/getStoreLookupByLatLon'
    }),
    currentFacilityCoords() {
      return this.FacilityLatLon;
    },
    nearbyStores() {
      return this.storeLookupByLatLon || [];
    }
  },
  async mounted() {
    // Create a copy of otherStoresInventory on mount
    this.storesInventory = this.otherStoresInventory.slice();

    // fetch latitude and longitude of the facility by dispatching an action
    try {
      await this.store.dispatch("util/fetchCurrentFacilityLatLon", this.currentFacilityId);

      if (this.currentFacilityCoords?.latitude && this.currentFacilityCoords?.longitude) {
        await this.store.dispatch("util/fetchStoreLookupByLatLon", {
          latitude: this.currentFacilityCoords.latitude,
          longitude: this.currentFacilityCoords.longitude
        });
        this.ATPMappedStoresInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
        // Sort by name by default
        this.sortByName();
      } else {
        throw new Error('Invalid facility coordinates');
      }
    } catch (error) {
      throw new Error('Error fetching facility coordinates');
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    searchFacilities() {
      // First get the full mapped inventory
      let filteredInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
  
  // Apply search filter if query exists
  if (this.queryString.trim() !== "") {
    filteredInventory = filteredInventory.filter((store: any) =>
      store.storeName.toLowerCase().includes(this.queryString.toLowerCase())
    );
  }
  
  // Apply hide empty stores filter if active
  if (this.hideEmptyStores) {
    filteredInventory = filteredInventory.filter((store: any) => store.stock > 0);
  }
  
  this.ATPMappedStoresInventory = filteredInventory;
}
,
mapStock(storesInventory: any[], storeLookupByLatLon: any[]): any[] {
  // Skip first item (current facility) using slice(1)
  return storeLookupByLatLon.slice(1).map((store, index) => {
    const matchingFacility = storesInventory.find(facility => facility.facilityId === store.storeCode);
    return {
      ...store,
      index: index + 1,
      stock: matchingFacility ? matchingFacility.stock : 0
    };
  });
},
sortByDistance() {
  this.activeSortType = 'distance';
  this.ATPMappedStoresInventory.sort((a: any, b: any) => a.dist - b.dist);
},

sortByName() {
  this.activeSortType = 'name';
  this.ATPMappedStoresInventory.sort((a: any, b: any) => a.storeName.localeCompare(b.storeName));
},
toggleHideEmptyStock() {
  this.hideEmptyStores = !this.hideEmptyStores;
  if (this.hideEmptyStores) {
    this.ATPMappedStoresInventory = this.ATPMappedStoresInventory.filter((store: any) => store.stock > 0);
  } else {
    // Reset to full list
    this.ATPMappedStoresInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
  }
}

  },
  setup() {
    const store = useStore();
    return {
      close,
      locationOutline,
      textOutline,
      store,
      translate
    };
  }
});
</script>