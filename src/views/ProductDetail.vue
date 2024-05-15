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
              <ion-segment value="inStore">
                <ion-segment-button value="inStore" @click="selectedSegment = 'inStore'">
                  <ion-label>In Store</ion-label>
                </ion-segment-button>
                <ion-segment-button value="otherLocations" @click="selectedSegment = 'otherLocations'">
                  <ion-label>Other Locations</ion-label>
                </ion-segment-button>
              </ion-segment>
  
              <ion-list v-if="selectedSegment === 'inStore'">
                <ion-item>
                  <ion-label class="ion-text-wrap">Quantity on hand</ion-label>
                  <ion-note slot="end">{{  getProductStock(product.variants[0].productId)?.quantityOnHandTotal ?? '0' }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">Safety Stock</ion-label>
                  <ion-note slot="end">{{ getMinimumStock() }}</ion-note>
                </ion-item>
                <ion-item>
                  <ion-label class="ion-text-wrap">Order Reservation</ion-label>
                  <ion-note slot="end">{{ reservedQuantity ?? '0' }}</ion-note>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">Available to promise</ion-label>
                  <ion-badge color="success" slot="end">{{ getOnlineAtp() }}</ion-badge>
                </ion-item>
              </ion-list>
  
              <ion-list v-if="selectedSegment === 'otherLocations'">
                <ion-item>
                  <ion-label class="ion-text-wrap">Other Stores</ion-label>
                  <ion-button @click="getOtherStoresInventoryDetails()" fill="outline">{{ otherStoresInventory }}</ion-button>
                </ion-item>
                <ion-item lines="none">
                  <ion-label class="ion-text-wrap">Warehouse</ion-label>
                  <ion-note slot="end">{{ warehouseInventory }}</ion-note>
                </ion-item>
              </ion-list>
            </div>
          </section>
        </div>
    
        <div>
          <h3> {{ reservedQuantity ?? '0' }} order reservtion at the store</h3>
          <div class="reservation-section">
            <div v-for="(order, index) in otherItem" :key="index">
            <ion-card> 
              <ion-item lines="none">
                <ion-label class="ion-text-wrap"> {{ order.orderId }}
                  <p>{{ order.customer ? order.customer.name : '' }}</p>
                </ion-label>
                <ion-badge color="primary" slot="end">{{ order.category }}</ion-badge> 
              </ion-item>

              <ion-item lines="none" v-for="(item, index) in getOrderItems(order)" :key="index"> 
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h4>{{ item.brand }}</h4>
                  <h3 class="ion-text-wrap">{{ item.virtualName }}</h3>
                </ion-label>
                <ion-note slot="end">{{ item.quantity }}</ion-note>
              </ion-item>
                <!-- other items -->
              <ion-list-header n-list-header color="light" v-if="order.parts[0].items.some((item: any) => item.productId != this.product.variants[0].productId)">
                <ion-label>Order items</ion-label>
              </ion-list-header>
              <ion-item lines="none" v-for="(item, index) in getOtherItems(order)" :key="index" >
                <ion-thumbnail slot="start">
                  <DxpShopifyImg size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap" >
                  <p class="overline">{{ item.brand }}</p>
                  <h3 class="ion-text-wrap">{{ item.virtualName }}</h3>
                </ion-label>
              </ion-item>
            </ion-card>
            </div>
          </div>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonRow,
  IonSegment,
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { StockService } from '@/services/StockService'
import { getFeature, showToast } from "@/utils";
import { hasError } from '@/adapter'
import { sortSizes } from '@/apparel-sorter';
import OtherStoresInventoryModal from "./OtherStoresInventoryModal.vue";
import { DxpShopifyImg, getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from "@/logger";
import { prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';

export default defineComponent({
  name: "ProductDetail",
  components: {
    IonBackButton,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonPage,
    IonRow,
    IonSegment,
    IonTitle,
    IonToolbar,
    DxpShopifyImg
  },
  data() {
    return {
      selectedColor: '',
      selectedSize: '',
      features: [] as any,
      currentVariant: {} as any,
      currentStoreInventory: 0,
      otherStoresInventory: 0,
      warehouseInventory: 0,
      otherStoresInventoryDetails: [] as any,
      selectedSegment: 'inStore',
      queryString: '',
      reservedQuantity: ''
    }
  },
  computed: {
    ...mapGetters({
      product: "product/getCurrent",
      currentFacility: 'user/getCurrentFacility',
      currency: 'user/getCurrency',
      getProductStock: 'stock/getProductStock',
      getInventoryCount: 'stock/getInventoryCount',
      otherItem: 'order/getOtherItem',
      getProduct: 'product/getProduct',
    }),
    getOrderItems() {
      return (order: any) => order.parts[0].items.filter((item: any) => item.productId == this.product.variants[0].productId);
    },
    getOtherItems() {
      return (order: any) => order.parts[0].items.filter((item: any) => item.productId != this.product.variants[0].productId);
    }
  },
  async beforeMount() {
    await this.store.dispatch('product/setCurrent', { productId: this.$route.params.productId })
    await this.store.dispatch('stock/fetchStock', { productId: this.product.variants[0].productId })
    await this.store.dispatch('stock/fetchInvCount', { productId: this.product.variants[0].productId });
    if (this.product.variants) {
      this.getFeatures()
      await this.updateVariant()
    }
  },
  methods: {
    getMinimumStock() {
      const inventoryCount = this.getInventoryCount;
      const productId = this.currentVariant.productId;
      if (inventoryCount && inventoryCount[productId]) {
        return inventoryCount[productId][this.currentFacility.facilityId]?.minimumStock ?? 0;
      }
      return 0;
    },
    getOnlineAtp() {
      const inventoryCount = this.getInventoryCount;
      const productId = this.currentVariant.productId;
      if (inventoryCount && inventoryCount[productId]) {
        return inventoryCount[productId][this.currentFacility.facilityId]?.onlineAtp ?? 0;
      }
      return 0;
    },

    //For fetching the order reservation count.
    async fetchReservedQuantity(productId: any){
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        defType: "edismax",
        filters: {
          facilityId: this.currentFacility.facilityId,
          productId: productId
        },
        facet: {
          "reservedQuantityFacet": "sum(itemQuantity)"
        }
      })
      try {
        const resp = await UtilService.fetchReservedQuantity(payload)
        if(resp.status == 200 && !hasError(resp)) {
          this.reservedQuantity = resp.data.facets.reservedQuantityFacet
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch reserved quantity', err)
      }
    },

    //For fetching all the orders for this product & facility.
    async getOpenOrders (vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.store.dispatch("order/getOrderDetails", { viewSize, viewIndex, facilityId: this.currentFacility.facilityId, productId: this.currentVariant.productId});
    },
    async applyFeature(feature: string, type: string) {
      if(type === 'color') this.selectedColor = feature;
      else if(type === 'size') this.selectedSize = feature
      await this.updateVariant();
    },
    getFeatures() {
      const features = {} as any
      this.product.variants.map((variant: any) => {
        const size = getFeature(variant.featureHierarchy, '1/SIZE/');
        const color = getFeature(variant.featureHierarchy, '1/COLOR/');
        if (!features[color]) features[color] = [size];
        else if(!features[color].includes(size)) features[color].push(size);
      });

      Object.keys(features).forEach((color) => this.features[color] = sortSizes(features[color]))

      this.selectedColor = Object.keys(this.features)[0];
      this.selectedSize = this.features[this.selectedColor][0];
    },
    async updateVariant() {
      let variant;
      if(this.selectedColor || this.selectedSize) {
        variant = this.product.variants.find((variant: any) => {
          const hasSize = getFeature(variant.featureHierarchy, '1/SIZE/') === this.selectedSize;
          const hasColor = getFeature(variant.featureHierarchy, '1/COLOR/') === this.selectedColor;
          return hasSize && hasColor;
        })

        // if the selected size is not available for that color, default it to the first size available
        if(!variant) {
          this.selectedSize = this.features[this.selectedColor][0];
          variant = this.product.variants.find((variant: any) => getFeature(variant.featureHierarchy, '1/SIZE/') === this.selectedSize)
          showToast(translate("Selected variant not available"));
        }
      }
      
      // if the variant does not have color or size as features
      this.currentVariant = variant || this.product.variants[0];
      await this.checkInventory();
      await this.getOpenOrders();
      this.fetchReservedQuantity( this.currentVariant.productId );
    },
    async checkInventory() {
      this.currentStoreInventory = this.otherStoresInventory = this.warehouseInventory = 0
      this.otherStoresInventoryDetails = []

      try {
        const resp: any = await StockService.checkInventory({
          "filters": { 
            "productId": this.currentVariant.productId,
            "facilityTypeId_fld0_value": 'WAREHOUSE',
            "facilityTypeId_fld0_op": 'equals',
            "facilityTypeId_fld0_grp": '1',
            "facilityTypeId_fld1_value": 'RETAIL_STORE',
            "facilityTypeId_fld1_op": 'equals',
            "facilityTypeId_fld1_grp": '2'
          },
          "fieldsToSelect": ["productId", "atp", "facilityName", "facilityId", "facilityTypeId"],
        });

        if (resp.status === 200 && !hasError(resp) && resp.data.docs.length) {
          resp.data.docs.map((storeInventory: any) => {
            if(storeInventory.atp) {
              const isCurrentStore = storeInventory.facilityId === this.currentFacility.facilityId;
              if (isCurrentStore) this.currentStoreInventory = storeInventory.atp;
              if (storeInventory.facilityTypeId === 'WAREHOUSE') {
                this.warehouseInventory += storeInventory.atp
              } else if (!isCurrentStore) {
                // Only add to list if it is not a current store
                this.otherStoresInventoryDetails.push({ facilityName: storeInventory.facilityName, stock: storeInventory.atp })
                this.otherStoresInventory += storeInventory.atp
              }
            }
          })
        }
      } catch (error) {
        logger.error(error)
        showToast(translate("Something went wrong"));
      }
    },
    async getOtherStoresInventoryDetails() {
      const otherStoresInventoryModal = await modalController.create({
        component: OtherStoresInventoryModal,
        componentProps: { otherStoresInventory: this.otherStoresInventoryDetails }
      });
      return otherStoresInventoryModal.present();
    }
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      getProductIdentificationValue,
      productIdentificationPref,
      store,
      translate
    }
  }
});
</script>

<style scoped>
.product-image {
  text-align: center;
}

.product-image > img {
  width: 200px;
}

.reservation-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  /* gap: 5px; */
}

.product-section {
  display: grid;
  grid-template-columns: auto 500px;
  max-width: 1042px;
  margin: auto;
}

@media (min-width: 720px) {
  main {
    padding: var(--spacer-sm);
    margin: auto;
  }

  .product-image > img {
    width: 400px;
  }
}
</style>
 