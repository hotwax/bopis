<template>
  <ion-header data-testid="assign-picker-modal-header">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Assign Pickers") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()" />
    </ion-toolbar>
  </ion-header>

  <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">

    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Fetching pickers") }}</ion-label>
    </div>
    <div class="empty-state" v-else-if="!availablePickers.length">{{ translate('No picker found') }}</div>

    <ion-list v-else>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div>
        <ion-radio-group v-model="selectedPicker">
          <ion-item v-for="(picker, index) in availablePickers" :key="index">
            <ion-radio data-testid="assign-picker-radio" :value="picker.id">
              <ion-label>
                {{ picker.name }}
                <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>
     <!--
        When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
        Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
        In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
        The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
        To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
        If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
        We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
      -->
    <ion-infinite-scroll
      @ionInfinite="loadMorePickers($event)"
      threshold="100px"
      v-show="isScrollable"
      ref="infiniteScrollRef"
    >
      <ion-infinite-scroll-content
        loading-spinner="crescent"
        :loading-text="translate('Loading')"
      />
    </ion-infinite-scroll>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="assign-picker-save-button" @click="readyForPickup()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonRadio, IonRadioGroup, IonSearchbar, IonSpinner, IonTitle, IonToolbar, IonInfiniteScroll, IonInfiniteScrollContent, modalController } from "@ionic/vue";
import { onMounted, ref } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { useOrderStore } from '@/store/order'
import { commonUtil, logger, translate } from "@common";

const orderStore = useOrderStore();

const selectedPicker = ref('');
const queryString = ref('');
const availablePickers = ref([] as any);
const isScrollable = ref(true);
const isScrollingEnabled = ref(false);
const isLoading = ref(false);
const contentRef = ref(null as any);
const infiniteScrollRef = ref(null as any);

const closeModal = () => {
  modalController.dismiss({ dismissed: true });
};

const searchPicker = async () => {
  availablePickers.value = [];
  await getPicker();
};

const readyForPickup = () => {
  if (selectedPicker.value) {
    const picker = availablePickers.value.find((picker: any) => picker.id == selectedPicker.value);
    modalController.dismiss({ dismissed: true, selectedPicker: selectedPicker.value, picker });
  } else {
    commonUtil.showToast(translate('Select a picker'));
  }
};

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  if (!parentElement) return;
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']");
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
};

const loadMorePickers = async (event: any) => {
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  const viewSize = import.meta.env.VITE_VIEW_SIZE ? parseInt(import.meta.env.VITE_VIEW_SIZE) : 10;
  await getPicker(
    undefined,
    Math.ceil(
      availablePickers.value.length / viewSize
    ).toString()
  );
  await event.target.complete();
};

const getPicker = async (vSize?: any, vIndex?: any) => {
  if(!vIndex) isLoading.value = true;
  const viewSize = vSize ? vSize : (import.meta.env.VITE_VIEW_SIZE ? parseInt(import.meta.env.VITE_VIEW_SIZE) : 10);
  let query = "";

  if(queryString.value.length > 0) {
    let keyword = queryString.value.trim().split(' ');
    query = `(${keyword.map(key => `*${key}*`).join(' OR ')}) OR "${queryString.value}"^100`;
  }
  else {
    query = `*:*`;
  }

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "start": viewSize * (vIndex ? parseInt(vIndex) : 0),
        "q": query,
        "defType" : "edismax",
        "qf": "firstName lastName groupName partyId externalId",
        "sort": "firstName asc"
      },
      "filter": ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true", "-partyId:_NA_"]
    }
  };
  let total = 0;

  try {
    const resp = await orderStore.getAvailablePickers(payload);
    if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.response.docs.length > 0) {
      const pickers = resp.data.response.docs.map((picker: any) => ({
        name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName)
            ? (picker.firstName ? picker.firstName : '') + (picker.lastName ? ' ' + picker.lastName : '') : picker.partyId,
        id: picker.partyId,
        externalId: picker.externalId
      }));
      availablePickers.value = availablePickers.value.concat(pickers);
      total = resp.data.response?.numFound;
    } else {
      logger.error(translate('Something went wrong'));
    }
  } catch (err) {
    logger.error(translate('Something went wrong'));
  }
  isScrollable.value = availablePickers.value.length < total;
  isLoading.value = false;
};

onMounted(async () => {
  await getPicker();
});

</script>

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}

ion-chip {
  flex-shrink: 0;
}
</style>
