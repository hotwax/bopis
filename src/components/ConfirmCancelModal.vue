<template>
  <ion-header data-testid="confirm-cancel-modal-header">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Cancel items") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Summary") }}</ion-list-header>
      <ion-item v-for="(item, index) in cancelledItems" :key="index"  :lines="index === cancelledItems.length - 1 ? 'full' : 'inset'">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label class="ion-text-wrap">
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p class="ion-text-wrap">{{ getCancelReasonDescription(item.cancelReason) }}</p>
          <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
        </ion-label>
        <ion-note slot="end">{{ item.unitPrice ? formatCurrency(item.unitPrice, order.currencyUom) : "" }}</ion-note>
      </ion-item>

      <ion-item lines="full">
        <ion-label>{{ translate("Total") }}</ion-label>
        <ion-note slot="end">{{ formatCurrency(orderTotal, order.currencyUom) }}</ion-note>
      </ion-item>

      <ion-item lines="full" v-if="isCancelationSyncJobEnabled && isProcessRefundEnabled">
        <ion-label>
          {{ translate("Estimated time to refund customer on Shopify") }}
          <p>{{ translate("Showing the next estimated time to sync cancellation to Shopify") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else-if="isCancelationSyncJobEnabled">
        <ion-label>
          {{ translate("Estimated time to cancellation on Shopify") }}
          <p>{{ translate("Cancellation sync to Shopify is enabled. Refund processing is disabled.") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else>
        <ion-label>
          {{ translate("Cancellation not syncing to Shopify") }}
          <p>{{ translate("Cancellation and refund sync to Shopify is not enabled.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-button class="ion-margin" color="danger" @click="cancelOrder">
      {{ translate("Confirm Cancellation") }}
    </ion-button>
  </ion-content>
</template>
    
<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonTitle, IonThumbnail, IonToolbar, modalController } from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import { closeOutline } from "ionicons/icons";
import { OrderService } from "@/services/OrderService";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { isKit } from "@/utils/order"
import { formatCurrency, showToast } from "@/utils";
import { hasError } from "@hotwax/oms-api";
import { DateTime } from "luxon";
import emitter from "@/event-bus";

import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useUtilStore } from "@/store/util";

const props = defineProps(["order", "isCancelationSyncJobEnabled", "isProcessRefundEnabled", "cancelJobNextRunTime", "orderType"]);

const cancelledItems = ref([] as Array<any>);
const orderTotal = ref(0);
const currentOrder = ref({} as any);
const runTimeDiff = ref("");

const getProduct = (productId: string) => useProductStore().getProduct(productId);
const cancelReasons = computed(() => useUtilStore().getCancelReasons);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

onMounted(() => {
  currentOrder.value = JSON.parse(JSON.stringify(props.order))
  cancelledItems.value = currentOrder.value.shipGroup.items.filter((item: any) => item.cancelReason)
  orderTotal.value = cancelledItems.value.reduce((total: any, item: any) => getProduct(item.productId).LIST_PRICE_PURCHASE_USD_STORE_GROUP_price + total, 0)
  const timeDiff = DateTime.fromMillis(props.cancelJobNextRunTime).diff(DateTime.local());
  runTimeDiff.value = DateTime.local().plus(timeDiff).toRelative() || "";
});

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function getCancelReasonDescription(cancelReasonId: string) {
  const reason = cancelReasons.value?.find((reason: any) => reason.enumId === cancelReasonId)
  return reason?.enumDescription ? reason.enumDescription : reason?.enumId;
}

async function cancelOrder() {
  emitter.emit("presentLoader");

  const itemsPayload = cancelledItems.value.map((item: any) => ({
    orderItemSeqId: item.orderItemSeqId,
    shipGroupSeqId: item.shipGroupSeqId,
    reason: item.cancelReason,
    comment: item.comment || ''
  }));

  const payload = {
    orderId: currentOrder.value.orderId,
    items: itemsPayload
  };

  let cancelledResponse;

  try {
    cancelledResponse = await OrderService.cancelOrder(payload);

    if (hasError(cancelledResponse)) {
      throw cancelledResponse.data;
    }

    const toastMessage = currentOrder.value.shipGroup.items.length === itemsPayload.length ? translate('All items have been cancelled.') : translate('Some items have been cancelled.');
    showToast(toastMessage);

    // Remove the cancelled items from the order details page
    const cancelledItemSeqIds = new Set(itemsPayload.map(item => item.orderItemSeqId));
    currentOrder.value["shipGroup"] = {
      ...currentOrder.value.shipGroup,
      items: currentOrder.value.shipGroup.items.filter(
        (orderItem: any) => !cancelledItemSeqIds.has(orderItem.orderItemSeqId)
      )
    };
  } catch (err) {
    console.error("Error cancelling order items", err);
  }

  // If all the items are cancelled then mark the whole order as cancelled
  if (!currentOrder.value.shipGroup.items.length) {
    currentOrder.value.cancelled = true;
  }

  await useOrderStore().updateCurrent({ order: currentOrder.value });
  emitter.emit("dismissLoader");
  closeModal();
}
</script>
