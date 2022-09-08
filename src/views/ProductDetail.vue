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
          <Image :src="productDetail.mainImageUrl" />
        </section>

        <section class="product-info">
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p class="overline">{{ productDetail.brandName }}</p>
              <h1>{{ productDetail.parentProductName }}</h1>
            </ion-label>
            <ion-note slot="end">${{ productDetail.BASE_PRICE_PURCHASE_USD_NN_STORE_GROUP_price }}</ion-note>
          </ion-item>

          <ion-list v-if="$filters.getFeaturesList(productDetail.featureHierarchy, '1/COLOR/').length">
            <ion-list-header>{{ $t("Color") }}</ion-list-header>
            <ion-item lines="none">
              <ion-row>
                <ion-chip v-bind:key="colorFeature" v-for="colorFeature in $filters.getFeaturesList(productDetail.featureHierarchy, '1/COLOR/')" @click="filter(sizeFeature, 'color')"> <ion-label>{{ colorFeature }}</ion-label></ion-chip>
              </ion-row>
            </ion-item>
          </ion-list>

          <ion-list v-if="$filters.getFeaturesList(productDetail.featureHierarchy, '1/SIZE/').length">
            <ion-list-header>{{ $t("Size") }}</ion-list-header>
            <ion-item lines="none">
              <ion-row>
                <ion-chip v-bind:key="sizeFeature" v-for="sizeFeature in $filters.getFeaturesList(productDetail.featureHierarchy, '1/SIZE/')" @click="filter(sizeFeature, 'size')"> <ion-label>{{ sizeFeature }}</ion-label></ion-chip>
              </ion-row>
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>{{ $t("Inventory") }}</ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("In store") }}</ion-label>
              <ion-note slot="end">15 {{ $t("in stock") }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Other stores") }}</ion-label>
              <ion-button fill="outline">15 {{ $t("in stock") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ $t("Warehouse") }}</ion-label>
              <ion-note slot="end">{{ $t("in stock") }}</ion-note>
            </ion-item>
          </ion-list>

          <ion-card>
            <ion-list>
              <ion-item-divider>
                <ion-label class="ion-text-wrap">{{ $t("Other stores") }}</ion-label>
              </ion-item-divider>
              <ion-item>
                <ion-label class="ion-text-wrap">Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonRow,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex"
import Image from "../components/Image.vue";

export default defineComponent({
  name: "ProductDetail",
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonItem,
    IonItemDivider,
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
      productDetail: {} as any,
      filters: {
        color: [] as any,
        size: [] as any
      } as any
    }
  },
  computed: {
    ...mapGetters({
      product: 'product/getProduct',
      getProductStock: 'stock/getProductStock'
    })
  },
  methods: {
    async getProductDetail(productId: any) {
      await this.store.dispatch('product/fetchProduct', productId)
      .then(() => { 
        this.productDetail = this.product(productId)
      })
    },
    getCurrentProductPart() {
      if (this.product.parts) {
        return this.product.parts.find((part: any) => part.productPartSeqId === this.$route.params.productPartSeqId)
      }
      return {}
    },
    filter (featureValue: any, type: any) {
      if (this.filters[type].includes(featureValue)) {
        const index = this.filters[type].indexOf(featureValue);
        this.filters[type].splice(index,1);
      }
      else {
        this.filters[type].push(featureValue);
      }
    }
  },
  async mounted() {
    await this.getProductDetail("12341")
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