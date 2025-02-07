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
    <ion-searchbar v-model="queryString" placeholder="Search store name" :debounce="500"
      @ionInput="queryString = $event.target.value; searchFacilities()"
      @keyup.enter="queryString = $event.target.value; searchFacilities()" />
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label>Hide facilities without stock</ion-label>
        <ion-toggle @click="toggleHideEmptyStock" />
      </ion-item>
    </ion-list>
    <ion-accordion-group v-if="atpMappedStoresInventory.length">
      <ion-accordion v-for="inventory in atpMappedStoresInventory" :key="inventory.storeCode"
        :value="String(inventory.storeCode)" :toggle-icon="hasWeekCalendar(inventory) ? caretDownCircle : false"
        :readonly="!hasWeekCalendar(inventory)">
        <ion-item slot="header" lines="inset">
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ inventory.storeCode }}</p>
            <h2>{{ inventory.storeName }}</h2>
            <ion-note v-if="hasWeekCalendar(inventory)" :color="inventory.isOpen ? '' : 'danger'">
              {{ inventory.hoursDisplay }}
            </ion-note>
            <p v-if="typeof inventory.dist === 'number'">{{ Math.round(inventory.dist) }} miles</p>
          </ion-label>
          <ion-button fill="clear" slot="end">
            <ion-note slot="end">{{ translate('ATP', { count: inventory.stock }) }}</ion-note>
          </ion-button>
        </ion-item>
        <div class="ion-padding" slot="content" v-if="hasWeekCalendar(inventory)">
          <ion-list lines="none">
            <ion-item v-for="day in weekArray" :key="day">
              <ion-label>
                <p>{{ capitalizeFirst(day) }}</p>
              </ion-label>
              <ion-label slot="end">
                <p v-if="inventory[`${day}_open`] && inventory[`${day}_close`]">
                  {{ formatTime(inventory[`${day}_open`]) }} - {{ formatTime(inventory[`${day}_close`]) }}
                </p>
                <p v-else>Closed</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </ion-accordion>
    </ion-accordion-group>
    <div v-else class="ion-text-center">
      <ion-spinner v-if="isRefreshing" name="crescent" />
      <p v-else>{{ translate("No inventory details found") }}</p>
    </div>
  </ion-content>
</template>

<script lang="ts">
import {
  IonAccordionGroup,
  IonAccordion,
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  modalController,
  IonSpinner
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, locationOutline, textOutline } from "ionicons/icons";
import { mapGetters } from "vuex";
import { useStore } from "@/store";
import { translate } from "@hotwax/dxp-components";
import { DateTime } from "luxon";

export default defineComponent({
  name: "OtherStoresInventoryModal",
  components: {
    IonAccordionGroup,
    IonAccordion,
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    IonSpinner
  },
  props: ["otherStoresInventory", "currentFacilityId"],
  data() {
    return {
      queryString: "",
      isRefreshing: false,
      storesInventory: [] as any, // will be used when fallback
      atpMappedStoresInventory: [] as any, // will be used primarily.
      hideEmptyStores: false,
      activeSortType: "name", // 'name' or 'distance'
      weekArray: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
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
    },
  },
  async mounted() {
    this.isRefreshing = true;
    // Create a copy of otherStoresInventory on mount
    this.storesInventory = this.otherStoresInventory.slice();
    // Fetching Lat Lon for current facility and then fetching store lookup
    try {
      await this.store.dispatch("util/fetchCurrentFacilityLatLon", this.currentFacilityId);
      if (this.currentFacilityCoords?.latitude && this.currentFacilityCoords?.longitude) {
        await this.store.dispatch("util/fetchStoreLookupByLatLon", {
          latitude: this.currentFacilityCoords.latitude,
          longitude: this.currentFacilityCoords.longitude
        });
        this.atpMappedStoresInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
      }
    } catch (error) {
      // Fallback mapping when APIs fail
      this.atpMappedStoresInventory = this.storesInventory.map((facility: any) => ({
        storeCode: facility.facilityId,
        storeName: facility.facilityName,
        stock: facility.stock
      }));
    } finally {
      this.isRefreshing = false;
    }
    // Sort by name by default in all cases
    this.sortByName();
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    searchFacilities() {
      this.isRefreshing = true;
      // First get the full mapped inventory
      let filteredInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
      if (this.queryString.trim() !== "") {
        filteredInventory = filteredInventory.filter((store: any) =>
          store.storeName.toLowerCase().includes(this.queryString.toLowerCase())
        );
      }

      // Apply hide empty stores filter if active
      if (this.hideEmptyStores) {
        filteredInventory = filteredInventory.filter((store: any) => store.stock > 0);
      }

      this.atpMappedStoresInventory = filteredInventory;
      this.isRefreshing = false;
    },
    // method to map the facilitty inventory to the store lookup data
    mapStock(storesInventory: any[], storeLookupByLatLon: any[]): any[] {
      // skip first item (current facility) using slice(1)
      return storeLookupByLatLon.slice(1).map((store, index) => {
        // Find the matching facility in the storesInventory array based on facilityId
        const matchingFacility = storesInventory.find(facility => facility.facilityId === store.storeCode);
        // Get the store hours status
        const storeHoursInfo = this.getStoreHoursStatus(store);
        // Return the modified object
        return {
          ...store,
          index: index + 1,
          stock: matchingFacility ? matchingFacility.stock : 0,
          hoursDisplay: storeHoursInfo.display,
          isOpen: storeHoursInfo.isOpen
        };
      });
    },
    // method to sort the stores by distance 
    sortByDistance() {
      this.activeSortType = 'distance';
      this.atpMappedStoresInventory.sort((a: any, b: any) => a.dist - b.dist);
    },
    // method to sort the stores by name
    sortByName() {
      this.activeSortType = 'name';
      this.atpMappedStoresInventory.sort((a: any, b: any) => a.storeName.localeCompare(b.storeName));
    },
    // method to run the current filter to maintain the current sort type when toggling empty stock toggle
    runCurrentFilter() {
      if (this.activeSortType === 'distance') {
        this.atpMappedStoresInventory.sort((a: any, b: any) => a.dist - b.dist);
      } else if (this.activeSortType === 'name') {
        this.atpMappedStoresInventory.sort((a: any, b: any) => a.storeName.localeCompare(b.storeName));
      }
    },
    // method to handle empty stock toggle
    toggleHideEmptyStock() {
      this.hideEmptyStores = !this.hideEmptyStores;
      if (this.hideEmptyStores) {
        this.atpMappedStoresInventory = this.atpMappedStoresInventory.filter((store: any) => store.stock > 0);
      } else {
        // Reset to full list
        this.atpMappedStoresInventory = this.mapStock(this.storesInventory, this.storeLookupByLatLon);
      }
      // Run the current filter to maintain the current sort type
      this.runCurrentFilter();
    },
    getCurrentWeekday() {
      const today = DateTime.now()
      // Get weekday index (1-7, Monday is 1, Sunday is 7)
      const weekdayIndex = today.weekday
      // Convert to 0-6 index (Sunday is 0, Monday is 1)
      const momentWeekday = weekdayIndex === 7 ? 0 : weekdayIndex
      return momentWeekday
    },
    // method to get the store hours status
    getStoreHoursStatus(store: any) {
      const currentDay = this.weekArray[this.getCurrentWeekday()];
      const hasCalendar = Object.keys(store).some(key => /_open$|_close$/.test(key));

      // Case 1: No calendar at all - return empty
      if (!hasCalendar) {
        return { display: '', isOpen: false };
      }

      const openKey = `${currentDay}_open`;
      const closeKey = `${currentDay}_close`;

      // Case 2: Has calendar and today's hours
      if (store[openKey] && store[closeKey]) {
        const now = DateTime.now();
        const openTime = DateTime.fromFormat(store[openKey], 'HH:mm:ss');
        const closeTime = DateTime.fromFormat(store[closeKey], 'HH:mm:ss');

        const openDisplay = openTime.toFormat('ha').toLowerCase();
        const closeDisplay = closeTime.toFormat('ha').toLowerCase();

        const isOpen = now >= openTime && now <= closeTime;

        return {
          display: isOpen ? `Open: ${openDisplay} - ${closeDisplay}` : 'Closed',
          isOpen
        };
      }

      // Case 3: Has calendar but no hours for today
      else return {
        display: 'Closed',
        isOpen: false
      };
    },
    hasWeekCalendar(store: any): boolean {
      return Object.keys(store).some(key => /_open$|_close$/.test(key));
    },
    capitalizeFirst(string: string): string {
      return string.charAt(0).toUpperCase() + string.slice(1);
    },
    formatTime(time: string): string {
      return DateTime.fromFormat(time, 'HH:mm:ss').toFormat('h:mm a');
    },
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