<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Inventory computation")}}</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Quantity on hand")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).quantityOnHand ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).minimumStock ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).reservedQuantity ?? '0' }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">{{ translate("Online ATP")}}</ion-label>
        <ion-badge slot="end" color="success">{{ getInventoryInformation(item.productId).onlineAtp ?? '0' }}</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonBadge, IonContent, IonItem, IonLabel, IonList, IonListHeader, IonNote } from '@ionic/vue'
import { onBeforeMount } from 'vue';
import { translate } from '@hotwax/dxp-components';
import { useStockStore } from '@/store/stock';

const props = defineProps(['item'])

const getInventoryInformation = (productId: string) => useStockStore().getInventoryInformation(productId);

onBeforeMount(async () => {
  const productId = props.item?.productId;
  if (productId) {
    await useStockStore().fetchProductInventory({ productId });
  }
});
</script>