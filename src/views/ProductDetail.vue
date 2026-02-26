<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/catalog" />
        <ion-title>{{ translate("Product details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="Object.keys(product).length > 0">
        <div class="product-section">
          
          <section class="product-image">
            <DxpShopifyImg :src="currentVariant.mainImageUrl" />
          </section>
  
          <section class="product-info">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ currentVariant.brandName }}</p>
                <h1>{{ getProductIdentificationValue(productIdentificationPref.primaryId, currentVariant) }}</h1>
                <h2>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, currentVariant) }}</h2>
              </ion-label>
              <!-- Price is given undefined to $n funtction on first render, hence, conditional rendering with empty string -->
              <ion-note slot="end">{{ currentVariant.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price ? $n(currentVariant.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price, 'currency', currency ) : '' }}</ion-note>
            </ion-item>
  
            <ion-list v-if="selectedColor">
              <ion-list-header>{{ translate("Colors") }}</ion-list-header>
              <ion-item lines="none">
                <ion-row>
                  <ion-chip :outline="selectedColor !== colorFeature" :key="colorFeature" v-for="colorFeature in Object.keys(features)" @click="selectedColor !== colorFeature && applyFeature(colorFeature, 'color')">
                    <ion-label class="ion-text-wrap">{{ colorFeature }}</ion-label>
                  </ion-chip>
                </ion-row>
              </ion-item>
            </ion-list>
  
            <ion-list v-if="selectedSize">
              <ion-list-header>{{ translate("Sizes") }} </ion-list-header>
              <ion-item lines="none">
                <ion-row>
                  <ion-chip :outline="selectedSize !== sizeFeature" :key="sizeFeature" v-for="sizeFeature in features[selectedColor]" @click="selectedSize !== sizeFeature && applyFeature(sizeFeature, 'size')">
                    <ion-label class="ion-text-wrap">{{ sizeFeature }}</ion-label>
                  </ion-chip>
                </ion-row>
              </ion-item>
            </ion-list>
            <div>
              <ion-segment :value="selectedSegment">
                <ion-segment-button value="inStore" @click="selectedSegment = 'inStore'">
                  <ion-label>In Store</ion-label>
                </ion-segment-button>
                <ion-segment-button value="otherLocations" @click="selectedSegment = 'otherLocations'">
                  <ion-label>Other Locations</ion-label>
                </ion-segment-button>
              </ion-segment>
  
              <ion-list v-if="selectedSegment === 'inStore'">
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Quantity on hand")}}</ion-label>
                  <ion-note slot="end">{{ getInventoryInformation(currentVariant.productId).quantityOnHand ?? '0' }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
                  <ion-note slot="end">{{ getInventoryInformation(currentVariant.productId).minimumStock ?? '0' }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
                  <ion-note slot="end">{{ getInventoryInformation(currentVariant.productId).reservedQuantity ?? '0' }}</ion-note>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">{{ translate("Available to promise")}}</ion-label>
                  <ion-badge color="success" slot="end">{{ getInventoryInformation(currentVariant.productId).onlineAtp ?? '0' }}</ion-badge>
                </ion-item>
              </ion-list>
  
              <ion-list v-if="selectedSegment === 'otherLocations'"> 
                <ion-item>
                  <ion-label class="ion-text-wrap">{{ translate("Other stores")}}</ion-label>
                  <ion-button @click="getOtherStoresInventoryDetails()" fill="outline">{{ translate('ATP', { count: otherStoresInventory}) }}</ion-button>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">{{ translate("Warehouse")}}</ion-label>
                  <ion-note slot="end">{{ translate('ATP', { count: warehouseInventory}) }}</ion-note>
                </ion-item>
              </ion-list>
            </div>
          </section>
        </div>
        
        <div v-if="orders.length">
          <h3>{{ translate('order reservations at', { count: getInventoryInformation(currentVariant.productId).reservedQuantity ?? '0', store: (currentFacility as any).facilityName }) }}</h3>
          <div class="reservation-section">
            <ion-card v-for="(order, index) in orders" :key="index"> 
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <h1>{{ order.customer.name }}</h1>
                  <p>{{ order.orderName ? order.orderName : order.orderId }}</p>
                </ion-label>
                <ion-badge color="primary" slot="end">
                  {{ order.shipmentMethod.shipmentMethodTypeDesc ? order.shipmentMethod.shipmentMethodTypeDesc : order.shipmentMethod.shipmentMethodTypeId }}
                </ion-badge> 
              </ion-item>
              
              <ion-item lines="none"> 
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(order.currentItem.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(order.currentItem.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(order.currentItem.productId)) : order.currentItem.productId }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(order.currentItem.productId)) }}</p>
                </ion-label>
                <ion-note slot="end">{{ translate(order.currentItem.quantity == 1 ? "unit" : "units", { item: order.currentItem.quantity }) }}</ion-note>
              </ion-item>
              <!-- other items -->
              <ion-list-header color="light" v-if="order.otherItems.length > 0">
                <ion-label>{{ translate("Other items")}}</ion-label>
              </ion-list-header>
              <ion-item lines="none" v-for="(item, index) in order.otherItems" :key="index" >
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap" >
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : item.productId }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>
                <ion-note slot="end">{{ translate(item.quantity == 1 ? "unit" : "units", { item: item.quantity }) }}</ion-note>
              </ion-item>
            </ion-card>
          </div>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonBadge, IonButton, IonCard, IonChip, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonNote, IonPage, IonRow, IonSegment, IonSegmentButton, IonTitle, IonThumbnail, IonToolbar, modalController } from "@ionic/vue";
import { computed, onMounted, ref, getCurrentInstance } from "vue";
import { useRoute } from 'vue-router';
import { useProductStore } from "@/store/product";
import { useUserStore } from "@/store/user";
import { useStockStore } from "@/store/stock";
import { useOrderStore } from "@/store/order";
import { StockService } from '@/services/StockService'
import { commonUtil } from "@/utils/commonUtil";
import { hasError } from '@/adapter'
import { sortSizes } from '@/apparel-sorter';
import OtherStoresInventoryModal from "./OtherStoresInventoryModal.vue";
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from "@/logger";

const route = useRoute();

const { proxy } = getCurrentInstance() as any;
const $n = proxy?.$n;

const selectedColor = ref('');
const selectedSize = ref('');
const features = ref({} as any);
const currentVariant = ref({} as any);
const currentStoreInventory = ref(0);
const otherStoresInventory = ref(0);
const warehouseInventory = ref(0);
const otherStoresInventoryDetails = ref([] as any);
const selectedSegment = ref('inStore');

const product = computed(() => useProductStore().getCurrent);
const currency = computed(() => useUserStore().getCurrency);
const getInventoryInformation = computed(() => useStockStore().getInventoryInformation);
const orders = computed(() => useOrderStore().getOrders);
const getProduct = computed(() => useProductStore().getProduct);
const currentEComStore = computed(() => useUserStore().getCurrentEComStore);
const productIdentificationPref = computed(() => useProductIdentificationStore().getProductIdentificationPref);
const currentFacility = computed(() => useUserStore().getCurrentFacility);

const getOrderDetails = async () => {
  await useOrderStore().getOrderDetails({ viewSize: 200, facilityId: (useUserStore().getCurrentFacility as any)?.facilityId, productId: currentVariant.value.productId });
};

const applyFeature = async (feature: string, type: string) => {
  if(type === 'color') selectedColor.value = feature;
  else if(type === 'size') selectedSize.value = feature;
  await updateVariant();
};

const getFeatures = () => {
  const allFeatures = {} as any
  product.value.variants.map((variant: any) => {
    const size = commonUtil.getFeature(variant.featureHierarchy, '1/SIZE/');
    const color = commonUtil.getFeature(variant.featureHierarchy, '1/COLOR/');
    if (!allFeatures[color]) allFeatures[color] = [size];
    else if(!allFeatures[color].includes(size)) allFeatures[color].push(size);
  });

  Object.keys(allFeatures).forEach((color) => features.value[color] = sortSizes(allFeatures[color]))

  selectedColor.value = Object.keys(features.value)[0];
  selectedSize.value = features.value[selectedColor.value][0];
};

const checkInventory = async () => {
  currentStoreInventory.value = otherStoresInventory.value = warehouseInventory.value = 0;
  otherStoresInventoryDetails.value = [];

  try {
    const resp: any = await StockService.checkShippingInventory({
      productStoreId: currentEComStore.value.productStoreId,
      productIds: currentVariant.value.productId,
    });

    if (resp.status === 200 && !hasError(resp)) {          
      const resultList = resp.data.resultList || [];
      
      resultList.forEach((productInventory: any) => {
        (productInventory.facilities || []).forEach((storeInventory: any) => {
          if (storeInventory.atp) {
            const isCurrentStore = storeInventory.facilityId === (currentFacility.value as any)?.facilityId;
            if (isCurrentStore) {
              currentStoreInventory.value = storeInventory.atp;
            }

            if (storeInventory.facilityTypeId === 'WAREHOUSE') {
              warehouseInventory.value += storeInventory.atp;
            } else if (!isCurrentStore) {
              // Only add to list if it is not a current store
              otherStoresInventoryDetails.value.push({ facilityName: storeInventory.facilityName || storeInventory.facilityId, stock: storeInventory.atp, facilityId: storeInventory.facilityId });
              otherStoresInventory.value += storeInventory.atp;
            }
          }
        });
      });
    }
  } catch (error) {
    logger.error(error);
    commonUtil.showToast(translate("Something went wrong"));
  }
};

const updateVariant = async () => {
  let variant;
  if(selectedColor.value || selectedSize.value) {
    variant = product.value.variants.find((v: any) => {
      const hasSize = commonUtil.getFeature(v.featureHierarchy, '1/SIZE/') === selectedSize.value;
      const hasColor = commonUtil.getFeature(v.featureHierarchy, '1/COLOR/') === selectedColor.value;
      return hasSize && hasColor;
    })

    // if the selected size is not available for that color, default it to the first size available
    if(!variant) {
      selectedSize.value = features.value[selectedColor.value][0];
      variant = product.value.variants.find((v: any) => commonUtil.getFeature(v.featureHierarchy, '1/SIZE/') === selectedSize.value)
      commonUtil.showToast(translate("Selected variant not available"));
    }
  }
  
  // if the variant does not have color or size as features
  currentVariant.value = variant || product.value.variants[0];
  await checkInventory();
  await getOrderDetails();
  await useStockStore().fetchProductInventory({ productId: currentVariant.value.productId });
};

const getOtherStoresInventoryDetails = async () => {
  const otherStoresInventoryModal = await modalController.create({
    component: OtherStoresInventoryModal,
    componentProps: { otherStoresInventory: otherStoresInventoryDetails.value }
  });
  return otherStoresInventoryModal.present();
};

onMounted(async () => {
  await useProductStore().setCurrent({ productId: route.params.productId });
  if (product.value.variants) {
    getFeatures();
    await updateVariant();
  }
  await useProductIdentificationStore().getIdentificationPref(useUserStore().getCurrentEComStore?.productStoreId);
});
</script>

<style scoped>
.product-image {
  text-align: center;
}

.reservation-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* gap: 5px; */
}

.product-section {
  display: flex;
  flex-wrap: wrap;
  max-width: 1042px;
  margin: auto;
}

.product-image {
  flex: 1 1 300px;
}

.product-info {
  flex: 2 1 360px;
}

@media (min-width: 720px) {
  main {
    padding: var(--spacer-sm);
  }
}
</style>
 
