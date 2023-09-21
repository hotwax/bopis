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
        <section class="product-image">
          <ShopifyImg :src="currentVariant.mainImageUrl" />
        </section>

        <section class="product-info">
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ currentVariant.brandName }}</p>
              <h1>{{ currentVariant.parentProductName }}</h1>
              <h2>{{ currentVariant.productName }}</h2>
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

          <ion-list>
            <ion-list-header>{{ translate("Inventory") }}</ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ translate("In store") }}</ion-label>
              <ion-note slot="end"> {{ currentStoreInventory }} {{ translate("in stock") }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ translate("Other stores") }}</ion-label>
              <ion-button @click="getOtherStoresInventoryDetails()" fill="outline">{{ otherStoresInventory }} {{ translate("in stock") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ translate("Warehouse") }}</ion-label>
              <ion-note slot="end">{{ warehouseInventory }} {{ translate("in stock") }}</ion-note>
            </ion-item>
          </ion-list>
        </section>
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
  IonTitle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { ShopifyImg } from '@hotwax/dxp-components'
import { StockService } from '@/services/StockService'
import { getFeature, showToast } from "@/utils";
import { hasError } from '@/adapter'
import { sortSizes } from '@/apparel-sorter';
import OtherStoresInventoryModal from "./OtherStoresInventoryModal.vue";
import { translate } from "@hotwax/dxp-components";

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
    IonTitle,
    IonToolbar,
    ShopifyImg
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
      otherStoresInventoryDetails: [] as any
    }
  },
  computed: {
    ...mapGetters({
      product: "product/getCurrent",
      currentFacility: 'user/getCurrentFacility',
      currency: 'user/getCurrency'
    })
  },
  async beforeMount() {
    await this.store.dispatch('product/setCurrent', { productId: this.$route.params.productId })
    if (this.product.variants) {
      this.getFeatures()
      await this.updateVariant()
    }
  },
  methods: {
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
        console.error(error)
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
    return {
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

@media (min-width: 720px) {
  main {
    display: grid;
    grid-template-columns: auto 500px;
    padding: var(--spacer-sm);
    max-width: 1042px;
    margin: auto;
  }

  .product-image > img {
    width: 400px;
  }
}
</style>
