<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
      <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" @keypress.enter="queryString = $event.target.value; getProducts()" />
      <main v-if="products.list.length">
        <ion-card button v-for="product in products.list" :key="product.productId"  @click="viewProduct(product)">
          <DxpShopifyImg :src="product.mainImageUrl" size="large"/>
          <ion-item lines="none">
            <ion-label>
              <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, product) }}</h2>
              <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, product) }}</p>
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
        v-show="isScrollable"
        ref="infiniteScrollRef"
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
      isScrollingEnabled: false
    };
  },
  computed: {
    ...mapGetters({
      products: "product/getProducts",
      isScrollable: "product/isScrollable"
    }),
  },
  methods: {
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMoreProducts(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isScrollable)) {
        await event.target.complete();
      }
      this.getProducts(
        undefined,
        Math.ceil(
          this.products.list?.length / (process.env.VUE_APP_VIEW_SIZE as any)
        ).toString()
      ).then(async () => {
        await event.target.complete();
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
    await this.store.dispatch("user/fetchBopisProductStoreSettings");
    this.isScrollingEnabled = false;
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
