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
            :color="sortBy === 'distance' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
        <ion-button @click="sortByName">
          <ion-icon slot="icon-only" :icon="textOutline" :color="sortBy === 'name' ? 'primary' : 'medium'"></ion-icon>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
    <ion-searchbar v-model="queryString" :placeholder="translate('Search store name')"
      @keyup.enter="queryString = $event.target.value; searchFacilities()" />
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-toggle @click="toggleHideEmptyStock" label-placement="start">{{ translate("Hide facilities without stock")}}</ion-toggle>
      </ion-item>
    </ion-list>
    <ion-accordion-group v-if="storesWithInventory.length">
      <template v-for="store in storesWithInventory" :key="store.storeCode">
        <!-- render accordion for items with calendar -->
        <ion-accordion v-if="hasWeekCalendar(store)" :value="store.storeCode">
          <ion-item slot="header" lines="inset">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ store.storeCode }}</p>
              <h2>{{ store.storeName }}</h2>
              <ion-note v-if="hasWeekCalendar(store)" :color="store.isOpen ? '' : 'danger'">
                {{ store.hoursDisplay }}
              </ion-note>
              <p v-if="typeof store.dist === 'number'">{{ Math.round(store.dist) }} {{ translate("miles") }}</p>
            </ion-label>
            <div slot="end">
              <ion-note slot="end">{{ translate('ATP', { count: store.stock }) }}</ion-note>
            </div>
          </ion-item>
          <div class="ion-padding" slot="content">
            <ion-list lines="none">
              <ion-item v-for="day in weekArray" :key="day">
                <ion-label>
                  <p>{{ translate(day) }}</p>
                </ion-label>
                <ion-label slot="end">
                  <p v-if="store[`${day}_open`] && store[`${day}_close`]">
                    {{ formatTime(store[`${day}_open`]) }} - {{ formatTime(store[`${day}_close`]) }}
                  </p>
                  <p v-else>{{ translate("Closed") }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </div>
        </ion-accordion>
        <!-- render list for items without calendar -->
        <ion-item v-else>
          <ion-label class="ion-text-wrap">
            <p class="overline">{{ store.storeCode }}</p>
            <h2>{{ store.storeName }}</h2>
            <p v-if="typeof store.dist === 'number'">{{ Math.round(store.dist) }} {{ translate("miles") }}</p>
          </ion-label>
          <div slot="end">
            <ion-note>{{ translate('ATP', { count: store.stock }) }}</ion-note>
          </div>
        </ion-item>
      </template>
    </ion-accordion-group>
    <div v-else class="ion-text-center">
      <ion-spinner v-if="isRefreshing" name="crescent" />
      <p v-else>{{ translate("No inventory details found") }}</p>
    </div>
  </ion-content>
</template>

<script setup lang="ts">
import { IonAccordionGroup, IonAccordion, IonButtons, IonButton, IonContent, IonHeader, IonItem, IonIcon, IonLabel, IonList, IonNote, IonSearchbar, IonTitle, IonToggle, IonToolbar, modalController, IonSpinner } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { close, locationOutline, textOutline } from "ionicons/icons";
import { useProductStore } from "@/store/productStore";
import { useUserStore } from "@/store/user";
import { translate } from "@common";
import { DateTime } from "luxon";

const props = defineProps(["otherStoresInventory"]);

const queryString = ref("");
const isRefreshing = ref(false);
const storesInventory = ref([] as any); // will be used when fallback
const storesWithInventory = ref([] as any); // will be used primarily.
const hideStoresWithoutInventory = ref(false);
const sortBy = ref("name"); // 'name' or 'distance'
const weekArray = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const currentFacility = computed(() => useProductStore().getCurrentFacility);

const formatTime = (time: string): string => {
  return DateTime.fromFormat(time, 'HH:mm:ss').toFormat('h:mm a');
};

const hasWeekCalendar = (store: any): boolean => {
  return Object.keys(store).some(key => /_open$|_close$/.test(key));
};

const getCurrentWeekday = () => {
  const today = DateTime.now(); // Get weekday index (1-7, Monday is 1, Sunday is 7)
  const weekdayIndex = today.weekday; // Convert to 0-6 index (Sunday is 0, Monday is 1)
  const momentWeekday = weekdayIndex === 7 ? 0 : weekdayIndex;
  return momentWeekday;
};

const getStoreHoursInfo = (store: any) => {
  const currentDay = weekArray[getCurrentWeekday()];
  const hasCalendar = Object.keys(store).some(key => /_open$|_close$/.test(key));

  if (!hasCalendar) {
    return { display: '', isOpen: false };
  }

  const openKey = `${currentDay}_open`;
  const closeKey = `${currentDay}_close`;

  if (store[openKey] && store[closeKey]) {
    const now = DateTime.now();
    const openTime = DateTime.fromFormat(store[openKey], 'HH:mm:ss');
    const closeTime = DateTime.fromFormat(store[closeKey], 'HH:mm:ss');

    const openDisplay = openTime.toFormat('hh:mm a').toLowerCase();
    const closeDisplay = closeTime.toFormat('hh:mm a').toLowerCase();

    const isOpen = now >= openTime && now <= closeTime;

    return {
      display: isOpen ? `${translate("Open")} ${openDisplay} - ${closeDisplay}` : translate("Closed"),
      isOpen
    };
  } else return {
    display: translate("Closed"),
    isOpen: false
  };
};

const mapStock = (storesInventory: any[], storesInformation: any[]): any[] => {
  return storesInformation.slice(1).map((store, index) => {  // skips first item (current facility)
    const matchingFacility = storesInventory.find(facility => facility.facilityId === store.storeCode);
    const storeHoursInfo = getStoreHoursInfo(store);
    return {
      ...store,
      index: index + 1,
      stock: matchingFacility ? matchingFacility.stock : 0,
      hoursDisplay: storeHoursInfo.display,
      isOpen: storeHoursInfo.isOpen
    };
  });
};

const sortStoresAlphabetically = (a: any, b: any): number => {
  return a.storeName.localeCompare(b.storeName);
};

const sortByDistance = () => {
  sortBy.value = 'distance';
  storesWithInventory.value.sort((a: any, b: any) => {
    if (a.dist === "Infinity" && b.dist === "Infinity") return sortStoresAlphabetically(a, b);
    if (a.dist === "Infinity") return 1;
    if (b.dist === "Infinity") return -1;
    return a.dist - b.dist;
  });
};

const sortByName = () => {
  sortBy.value = 'name';
  storesWithInventory.value.sort((a: any, b: any) => sortStoresAlphabetically(a, b));
};

const updateSort = () => {
  if (sortBy.value === 'distance') {
    sortByDistance();
  } else {
    sortByName();
  }
};

const searchFacilities = () => {
  isRefreshing.value = true;
  let filteredInventory = mapStock(storesInventory.value, useProductStore().getStoresInformation);
  if (queryString.value.trim() !== "") {
    filteredInventory = filteredInventory.filter((store: any) =>
      store.storeName.toLowerCase().includes(queryString.value.toLowerCase())
    );
  }
  if (hideStoresWithoutInventory.value) {
    filteredInventory = filteredInventory.filter((store: any) => store.stock > 0);
  }
  storesWithInventory.value = filteredInventory;
  isRefreshing.value = false;
};

const toggleHideEmptyStock = () => {
  hideStoresWithoutInventory.value = !hideStoresWithoutInventory.value;
  if (hideStoresWithoutInventory.value) {
    storesWithInventory.value = storesWithInventory.value.filter((store: any) => store.stock > 0);
  } else {
    storesWithInventory.value = mapStock(storesInventory.value, useProductStore().getStoresInformation);
  }
  updateSort();
};

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

onMounted(async () => {
  isRefreshing.value = true;
  storesInventory.value = props.otherStoresInventory.slice();
  const currentFacilityId = currentFacility.value?.facilityId;

  try {
    if (!useProductStore().getFacilityLatLon(currentFacilityId).latitude || !useProductStore().getFacilityLatLon(currentFacilityId).longitude) {
      await useProductStore().fetchCurrentFacilityLatLon(currentFacilityId);
    }

    if (!useProductStore().getStoresInformation || useProductStore().getStoresInformation.length === 0) {
      if (useProductStore().getFacilityLatLon(currentFacilityId)?.latitude && useProductStore().getFacilityLatLon(currentFacilityId)?.longitude) {
        await useProductStore().fetchStoresInformation({
          latitude: useProductStore().getFacilityLatLon(currentFacilityId).latitude,
          longitude: useProductStore().getFacilityLatLon(currentFacilityId).longitude
        });
      }
    }

    storesWithInventory.value = mapStock(storesInventory.value, useProductStore().getStoresInformation);
  } catch (error) {
    storesWithInventory.value = storesInventory.value.map((facility: any) => ({
      storeCode: facility.facilityId,
      storeName: facility.facilityName,
      stock: facility.stock
    }));
  } finally {
    isRefreshing.value = false;
  }

  sortByName();
});
</script>
