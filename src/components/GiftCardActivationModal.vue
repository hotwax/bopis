<template>
  <ion-header data-testid="giftcard-activation-modal-header">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button data-testid="giftcard-activation-close-button" @click="closeModal()">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Gift card activation") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Fetching gift card info.") }}</ion-label>
    </div>
    <ion-list v-else>
      <ion-item lines="none" v-if="!item.isGCActivated">
        <ion-input data-testid="giftcard-activation-input" :label="translate('Activation code')" :placeholder="translate('serial number')" :helper-text="translate('Scan or enter the unique code on the gift card')" v-model="activationCode" />
      </ion-item>

      <ion-item v-else>
        <ion-icon :icon="cardOutline" slot="start" />
        <ion-label data-testid="giftcard-activation-label">{{ item.gcInfo.cardNumber }}</ion-label>
        <ion-note slot="end">{{ getCreatedDateTime() }}</ion-note>
      </ion-item>

      <ion-item lines="none">
        <ion-icon :icon="giftOutline" slot="start" />
        <ion-label>
          {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productName }}
          <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
        </ion-label>
        <ion-label slot="end">{{ commonUtil.formatCurrency(item.unitPrice, currencyUom) }}</ion-label>
      </ion-item>

      <div class="ion-margin" v-if="!item.isGCActivated">
        <ion-button expand="block" fill="outline" @click="isCameraEnabled ? stopScan() : scan()">
          <ion-icon slot="start" :icon="isCameraEnabled ? stopOutline : cameraOutline" />
          {{ translate(isCameraEnabled ? "Stop" : "Scan") }}
        </ion-button>
        <StreamBarcodeReader class="scanning-preview"
          v-if="isCameraEnabled"
          @decode="onDecode"
        />
      </div>
    </ion-list>
  </ion-content>

  <ion-fab v-if="!item.isGCActivated" vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="giftcard-activation-save-button" @click="confirmSave()">
      <ion-icon :icon="cardOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonSpinner, IonTitle, IonToolbar, alertController, modalController } from "@ionic/vue";
import { computed, ref } from "vue";
import { cameraOutline, cardOutline, closeOutline, giftOutline, stopOutline } from "ionicons/icons";
import { useProductStore as useProductStoreSettings } from '@/store/productStore'
import { useOrder } from "@/composables/useOrder";
import { commonUtil, logger, translate } from '@common';
import { DateTime } from 'luxon';
import { StreamBarcodeReader } from "vue-barcode-reader";
import { useProductStore } from "@/store/product";

const props = defineProps(["item", "orderId", "customerId", "currencyUom"])

const productStore = useProductStore()

const isLoading = ref(false)
const activationCode = ref("")
const isCameraEnabled = ref(false)

const productIdentificationPref = computed(() => useProductStoreSettings().getProductIdentificationPref)
const getProduct = (productId: string) => productStore.getProduct(productId)

function closeModal(payload = {}) {
  modalController.dismiss({ dismissed: true, ...payload })
}

async function confirmSave() {
  if (!activationCode.value.trim()) {
    commonUtil.showToast(translate("Please enter a activation code."))
    return;
  }

  const alert = await alertController.create({
    header: translate("Activate gift card"),
    message: translate("This gift card code will be activated. The customer may also receive a notification about this activation. Please verify all information is entered correctly. This cannot be edited after activation.", { space: "<br /><br />" }),
    buttons: [
      {
        text: translate("Cancel"),
      },
      {
        text: translate("Activate"),
        handler: async () => {
          await activateGitCard()
        }
      }
    ],
  });
  return alert.present();
}

async function activateGitCard() {
  try {
    const resp = await useOrder().activateGiftCard({
      orderId: props.orderId,
      orderItemSeqId: props.item.orderItemSeqId,
      amount: props.item.unitPrice,
      typeEnumId: "GC_ACTIVATE",
      cardNumber: activationCode.value.trim(),
      partyId: props.customerId,
      fulfillmentDate: Date.now()
    })
    
    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Gift card activated successfully."))
      closeModal({ isGCActivated: true, item: props.item })
    } else {
      throw resp.data;
    }
  } catch (error: any) {
    commonUtil.showToast(translate("Failed to activate gift card."))
    logger.error(error);
  }
}

function getCreatedDateTime() {
  return DateTime.fromMillis(props.item.gcInfo.fulfillmentDate).toFormat("dd MMMM yyyy hh:mm a ZZZZ");
}

async function scan() {
  if (!(await commonUtil.hasWebcamAccess())) {
    commonUtil.showToast(translate("Camera access not allowed, please check permissons."));
    return;
  } 

  isCameraEnabled.value = true;
}

function stopScan() {
  isCameraEnabled.value = false
}

function onDecode(result: any) {
  if (result) activationCode.value = result
  isCameraEnabled.value = false;
}
</script>

<style scoped>
.scanning-preview {
  justify-self: center;
  max-width: 360px;
}
</style>
