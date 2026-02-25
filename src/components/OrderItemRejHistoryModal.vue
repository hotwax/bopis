<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Order item rejection history") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item v-for="(item, index) in orderRejectionHistory" :key="index">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
          <h5>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</h5>
        </ion-label>
        <ion-label slot="end" class="ion-text-right">
          <h2>{{ getRejectReasonDescription(item.changeReasonEnumId) }}</h2>
          <p>{{ item.changeUserLogin }}</p>
          <p>{{ getTime(item.changeDatetime) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div v-if="!orderRejectionHistory.length && !isLoading" class="empty-state">
      <p>{{ translate('No records found.') }}</p>
    </div>
  </ion-content>
</template>
  
<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonThumbnail, IonLabel, IonList, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { DateTime } from 'luxon';
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from '@hotwax/dxp-components';
import { useOrderStore } from '@/store/order';
import { useProductStore } from '@/store/product';
import { useUtilStore } from '@/store/util';

const orderStore = useOrderStore();
const productStore = useProductStore();
const utilStore = useUtilStore();

const isLoading = ref(true);

const getProduct = (productId: string) => productStore.getProduct(productId);
const order = computed(() => orderStore.getCurrent);
const rejectReasons = computed(() => utilStore.getRejectReasons);
const orderRejectionHistory = computed(() => orderStore.orderItemRejectionHistory);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

onMounted(async () => {
  await orderStore.getOrderItemRejectionHistory({ 
    orderId: order.value.orderId, 
    rejectReasonEnumIds: rejectReasons.value.map((reason: any) => reason.enumId) 
  });
  isLoading.value = false;
});

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function getRejectReasonDescription(rejectReasonEnumId: string) {
  const reason = rejectReasons.value.find((reason: any) => reason.enumId === rejectReasonEnumId)
  return reason?.enumDescription ? reason.enumDescription : reason?.description;
}

function getTime(time: number) {
  return time ? DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED) : ''
}
</script>