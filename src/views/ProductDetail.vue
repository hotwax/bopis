<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" defaultHref="/" />
        <ion-title>{{ $t("Product details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section class="product-image">
          <Image :src="currentVariant.mainImageUrl"/>
        </section>

        <section class="product-info">
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ currentVariant.brandName }}</p>
              <h1>{{ currentVariant.productName }}</h1>
            </ion-label>
            <ion-note slot="end">${{ currentVariant.LIST_PRICE_PURCHASE_USD_STORE_GROUP_price }}</ion-note>
          </ion-item>

          <ion-list v-if="selectedColor">
            <ion-list-header>{{ $t("Colors") }}</ion-list-header>
            <ion-item lines="none">
              <ion-row>
                <ion-chip :outline="selectedColor !== colorFeature" :key="colorFeature" v-for="colorFeature in Object.keys(features)" @click="applyFeature(colorFeature, 'color')">
                  <ion-label class="ion-text-wrap">{{ colorFeature }}</ion-label>
                </ion-chip>
              </ion-row>
            </ion-item>
          </ion-list>

          <ion-list v-if="selectedSize">
            <ion-list-header>{{ $t("Sizes") }} </ion-list-header>
            <ion-item lines="none">
              <ion-row>
                <ion-chip :outline="selectedSize !== sizeFeature" :key="sizeFeature" v-for="sizeFeature in features[selectedColor]" @click="applyFeature(sizeFeature, 'size')">
                  <ion-label class="ion-text-wrap">{{ sizeFeature }}</ion-label>
                </ion-chip>
              </ion-row>
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>{{ $t("Inventory") }}</ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("In store") }}</ion-label>
              <ion-note slot="end"> {{ currentStoreInventory }} {{ $t("in stock") }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Other stores") }}</ion-label>
              <ion-button @click="getOtherStoresInventoryDetails()" fill="outline">{{ otherStoresInventory }} {{ $t("in stock") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ $t("Warehouse") }}</ion-label>
              <ion-note slot="end">{{ warehouseInventory }} {{ $t("in stock") }}</ion-note>
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
import Image from "../components/Image.vue";
import { StockService } from '@/services/StockService'
import { hasError, getFeature, showToast } from "@/utils";
import { sortSizes } from '@/apparel-sorter';
import OtherStoresInventoryModal from "./OtherStoresInventoryModal.vue";
import { translate } from "@/i18n";

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
    Image
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
    })
  },
  async beforeMount() {
    await this.store.dispatch('product/getVariants', { productId: this.$route.params.productId })
    this.getFeatures()
    await this.updateVariant()
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
          if (hasSize && hasColor) return variant;
        })

        if(!variant) {
          this.selectedSize = this.features[this.selectedColor][0];
          variant = this.product.variants.find((variant: any) => getFeature(variant.featureHierarchy, '1/SIZE/') === this.selectedSize)
          showToast(translate("Selected variant not available"));
        }
      }
      this.currentVariant = variant;
      this.currentStoreInventory = this.otherStoresInventory = this.warehouseInventory = 0;
      this.otherStoresInventoryDetails = []
      await this.checkInventory();
    },
    async checkInventory() {
      try {
        const resp: any = await StockService.checkInventory({
          "filters": { "productId": this.currentVariant.productId },
          "fieldsToSelect": ["productId", "atp", "facilityName", "facilityId", "facilityTypeId"],
        });

        if (resp.status === 200 && !hasError(resp) && resp.data.docs.length) {
          resp.data.docs.filter((storeInventory: any) => {
            if (storeInventory.facilityTypeId === 'WAREHOUSE') this.warehouseInventory = storeInventory.atp
            if (storeInventory.facilityId === this.currentFacility.facilityId) {
              this.currentStoreInventory = storeInventory.atp
            } else {
              this.otherStoresInventoryDetails.push({ facilityName: storeInventory.facilityName, stock: storeInventory.atp })
              this.otherStoresInventory += storeInventory.atp
            }
          })
        } else {
          this.currentStoreInventory = this.otherStoresInventory = this.warehouseInventory = 0
          this.otherStoresInventoryDetails = []
        }
      } catch (error) {
        console.error(error)
        showToast(translate("Something went wrong"));
      }
    },
    async getOtherStoresInventoryDetails() {
      const otherStoresInventoryModal = await modalController.create({
        component: OtherStoresInventoryModal,
        componentProps: { otherStoresInventoryDetails: this.otherStoresInventoryDetails }
      });
      return otherStoresInventoryModal.present();
    }
  },
  setup() {
    const store = useStore();
    return {
      store
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
  }

  .product-image > img {
    width: 400px;
  }
}
</style>