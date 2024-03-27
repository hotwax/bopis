<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" @keypress.enter="queryString = $event.target.value; getProducts()" />
      <main v-if="products.list.length">
        <ion-card button v-for="product in products.list" :key="product.productId"  @click="viewProduct(product)">
          <DxpShopifyImg :src="product.mainImageUrl" size="large"/>
          <ion-item lines="none">
            <ion-label>
              <p>{{ getProductIdentificationValue(productIdentificationPref.primaryId, product) }}</p>
              {{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}
            </ion-label>
          </ion-item>
        </ion-card>
      </main>
      <div v-else class="ion-text-center">
        <p>{{ translate("No products found") }}</p>
      </div>
      <ion-infinite-scroll
        @ionInfinite="loadMoreProducts($event)"
        threshold="100px"
        :disabled="!isScrollable"
      >
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="translate('Loading')"
        />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonContent,
  IonHeader,
  IonInfiniteScrollContent,
  IonInfiniteScroll,
  IonItem,
  IonLabel,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { useRouter } from "vue-router";
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components'

export default defineComponent({
  name: 'Catalog',
  components: {
    IonCard,
    IonContent,
    IonHeader,
    IonInfiniteScrollContent,
    IonInfiniteScroll,
    IonItem,
    IonLabel,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    DxpShopifyImg,
  },
  data() {
    return {
      queryString: "",
    };
  },
  computed: {
    ...mapGetters({
      products: "product/getProducts",
      isScrollable: "product/isScrollable"
    }),
  },
  methods: {
    async loadMoreProducts(event: any) {
      this.getProducts(
        undefined,
        Math.ceil(
          this.products.list?.length / (process.env.VUE_APP_VIEW_SIZE as any)
        ).toString()
      ).then(() => {
        event.target.complete();
      });
    },
    async getProducts(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        queryString: this.queryString,
      };
      await this.store.dispatch("product/findProduct", payload);
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async viewProduct(product: any) {
      await this.store.dispatch('product/addProductToCache', product).then(() => {
        this.router.push({ path: `/product-detail/${product.productId}` });
      })
    }
  },

  async ionViewWillEnter() {
    this.queryString = this.products.queryString;
    this.getProducts();
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      getProductIdentificationValue,
      productIdentificationPref,
      router,
      store,
      translate
    };
  },
});
</script>
<style scoped>
main {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  align-items: start;
}
</style>
