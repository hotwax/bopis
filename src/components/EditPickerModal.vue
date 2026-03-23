<template>
  <ion-header data-testid="edit-picker-modal-header">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()" />

    <ion-list>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!availablePickers.length">{{ translate('No picker found') }}</div>

      <div v-else>
        <ion-radio-group :value="selectedPicker?.id">
          <ion-item v-for="(picker, index) in availablePickers" :key="index" @click="updateSelectedPicker(picker.id)">
            <ion-radio data-testid="edit-picker-radio" :value="picker.id">
              <ion-label>
                {{ picker.name }}
                <p>{{ picker.externalId ? picker.externalId : picker.id }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>

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
    <ion-fab-button data-testid="edit-picker-save-button" :disabled="isPickerAlreadySelected()" @click="confirmSave()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonListHeader, IonRadio, IonRadioGroup, IonSearchbar, IonSpinner, IonTitle, IonToolbar, alertController, modalController } from "@ionic/vue";
import { onMounted, ref } from "vue";
import { close, saveOutline } from "ionicons/icons";
import { commonUtil, logger, translate } from '@common';
import { useOrderStore } from "@/store/order";

const props = defineProps(['order'])

const orderStore = useOrderStore();

const availablePickers = ref([] as any)
const queryString = ref('')
const selectedPicker = ref({} as any)
const selectedPickerId = ref(props.order.pickerIds[0])
const isLoading = ref(false)
const isScrollable = ref(true)
const isScrollingEnabled = ref(false)
const contentRef = ref(null as any)
const infiniteScrollRef = ref(null as any)

onMounted(async () => {
  await findPickers()
  getAlreadyAssignedPicker()
})

function updateSelectedPicker(id: string) {
  selectedPicker.value = availablePickers.value.find((picker: any) => picker.id == id)
}

function enableScrolling() {
  const parentElement = contentRef.value?.$el
  if (!parentElement) return;
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
}

async function loadMorePickers(event: any) {
  // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  findPickers(
    undefined,
    Math.ceil(
      availablePickers.value.length / (import.meta.env.VITE_VIEW_SIZE as any)
    ).toString()
  ).then(async () => {
    await event.target.complete();
    // Retrieve already assigned picker if not already selected
    if(!selectedPicker.value.id) getAlreadyAssignedPicker();
  });
}

async function searchPicker() {
  availablePickers.value = []
  findPickers()
}

async function findPickers(vSize?: any, vIndex?: any) {
  if(!vIndex) isLoading.value = true;
  const viewSize = vSize ? vSize : import.meta.env.VITE_VIEW_SIZE;
  let query = {}

  if(queryString.value.length > 0) {
    let keyword = queryString.value.trim().split(' ')
    query = `(${keyword.map(key => `*${key}*`).join(' OR ')}) OR "${queryString.value}"^100`;
  }
  else {
    query = `*:*`
  }

  const payload = {
    "json": {
      "params": {
        "rows": viewSize,
        "start": (viewSize as any)*vIndex,
        "q": query,
        "defType" : "edismax",
        "qf": "firstName lastName groupName partyId externalId",
        "sort": "firstName asc"
      },
      "filter": ["docType:EMPLOYEE", "statusId:PARTY_ENABLED", "WAREHOUSE_PICKER_role:true"]
    }
  }
  let total = 0;

  try {
    const resp = await orderStore.getAvailablePickers(payload);
    if (resp.status === 200 && !commonUtil.hasError(resp) && resp.data.response.docs.length > 0) {
      const pickers = resp.data.response.docs.map((picker: any) => ({
        name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName)
            ? (picker.firstName ? picker.firstName : '') + (picker.lastName ? ' ' + picker.lastName : '') : picker.partyId,
        id: picker.partyId,
        externalId: picker.externalId
      }))
      availablePickers.value = availablePickers.value.concat(pickers);
      total = resp.data.response?.numFound;
    } else {
      throw resp.data;
    }
  } catch (err) {
    logger.error('Failed to fetch the pickers information or there are no pickers available', err)
  }
  isScrollable.value = availablePickers.value.length < total;
  isLoading.value = false;
}

async function confirmSave() {
  const message = translate("Replace current pickers with new selection?");
  const alert = await alertController.create({
    header: translate("Replace pickers"),
    message,
    buttons: [
      {
        text: translate("Cancel"),
      },
      {
        text: translate("Replace"),
        handler: async () => {
          try { 
            await resetPicker()
            closeModal({ selectedPicker: selectedPicker.value })
          } catch(err) {
            commonUtil.showToast(translate('Something went wrong, could not edit picker.'))
            logger.error('Something went wrong, could not edit picker', err)
            closeModal();
          }
        }
      }
    ],
  });
  return alert.present();
}

async function resetPicker() {
  const pickerId = selectedPicker.value.id
  // Api call to remove already selected picker and assign new picker
  const resp = await orderStore.resetPicker({
    pickerIds: pickerId,
    picklistId: props.order.picklistId
  });

  if(resp.status === 200 && !commonUtil.hasError(resp)) {
    commonUtil.showToast(translate("Pickers successfully replaced in the picklist with the new selections."))
  } else {
    throw resp.data
  }
}

function closeModal(payload = {}) {
  modalController.dismiss({ dismissed: true, ...payload });
}

function getAlreadyAssignedPicker() {
  selectedPicker.value = availablePickers.value.find((picker: any) => selectedPickerId.value === picker.id)
}

function isPickerAlreadySelected() {
  return selectedPicker.value?.id === selectedPickerId.value
}
</script>
