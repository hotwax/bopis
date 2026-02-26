<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
      <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
      <ion-badge color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
    </ion-label>
    <!-- Only show stock if its not a ship to store order -->
    <div class="show-kit-components" slot="end" v-if="!isShipToStoreOrder">
      <ion-spinner v-if="isFetchingStock" color="medium" name="crescent" />
      <div v-else-if="getInventoryInformation(item.productId).quantityOnHand >= 0" class="atp-info">
        <ion-note slot="end"> {{ translate("on hand", { count: getInventoryInformation(item.productId).quantityOnHand ?? '0' }) }} </ion-note>
        <ion-button size="default" fill="clear" @click.stop="openInventoryDetailPopover($event)">
          <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
        </ion-button>
      </div>
      <ion-button size="default" data-testid="qoh-button" v-else fill="clear" @click.stop="fetchProductInventory(item.productId)">
        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
      </ion-button>

      <ion-button data-testid="gift-card-activation-button" color="medium" fill="clear" size="default" v-if="(orderType === 'packed' || orderType === 'completed') && item.productTypeId === 'GIFT_CARD'" @click.stop="openGiftCardActivationModal(item)">
        <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
      </ion-button>
      
      <ion-button v-if="orderUtil.isKit(item)" fill="clear" size="default" @click.stop="fetchKitComponents(item)">
        <ion-icon v-if="showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
        <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
      </ion-button>

    </div>  
  </ion-item>

  <template v-if="showKitComponents && !getProduct(item.productId)?.productComponents">
    <ion-item lines="none">
      <ion-skeleton-text animated style="height: 80%;"/>
    </ion-item>
    <ion-item lines="none">
      <ion-skeleton-text animated style="height: 80%;"/>
    </ion-item>
  </template>
  <template v-else-if="showKitComponents && getProduct(item.productId)?.productComponents">
    <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
        </ion-thumbnail>
        <ion-label>
          <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
        </ion-label>
      </ion-item>
    </ion-card>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IonBadge, IonButton, IonCard, IonIcon, IonItem, IonLabel, IonNote, IonSkeletonText, IonSpinner, IonThumbnail, popoverController, modalController } from "@ionic/vue";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import { chevronUpOutline, cubeOutline, informationCircleOutline, listOutline, gift, giftOutline } from 'ionicons/icons'
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { orderUtil } from '@/utils/orderUtil'
import { useOrderStore } from "@/store/order";
import { useProductStore } from "@/store/product";
import { useStockStore } from "@/store/stock";

const props = defineProps(['item', 'isShipToStoreOrder', 'orderId', 'orderType', 'customerId', 'currencyUom']);

const productStore = useProductStore();
const stockStore = useStockStore();
const orderStore = useOrderStore();

const isFetchingStock = ref(false);
const showKitComponents = ref(false);

const getProduct = (productId: string) => productStore.getProduct(productId);
const getInventoryInformation = (productId: string) => stockStore.getInventoryInformation(productId);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);

async function fetchKitComponents(orderItem: any) {
  productStore.fetchProductComponents({ productId: orderItem.productId })
  showKitComponents.value = !showKitComponents.value
}

async function fetchProductInventory(productId: string) {
  isFetchingStock.value = true
  await stockStore.fetchProductInventory({ productId });
  isFetchingStock.value = false
}

async function openInventoryDetailPopover(Event: any){
  const popover = await popoverController.create({
    component: InventoryDetailsPopover,
    event: Event,
    showBackdrop: false,
    componentProps: { item: props.item }
  });
  await popover.present();
}

async function openGiftCardActivationModal(item: any) {
  const modal = await modalController.create({
    component: GiftCardActivationModal,
    componentProps: { item, orderId: props.orderId, customerId: props.customerId, currencyUom: props.currencyUom }
  })
  modal.onDidDismiss().then((result: any) => {
    if(result.data?.isGCActivated) {
      orderStore.updateCurrentItemGCActivationDetails({ item, orderId: props.orderId, orderType: props.orderType, isDetailsPage: false })
    }
  })
  modal.present();
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}

.atp-info {
  display: flex;
  align-items: center; 
  flex-direction: row; 
}
.show-kit-components {
  justify-items: end;
}
</style>
