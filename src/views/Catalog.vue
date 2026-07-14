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
              <h2>{{ product.productName }}</h2>
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

<script setup lang="ts">
import { IonCard, IonContent, IonHeader, IonInfiniteScrollContent, IonInfiniteScroll, IonItem, IonLabel, IonPage, IonSearchbar, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import { computed, ref } from 'vue';
import { DxpShopifyImg, translate } from '@common'
import { useProductStore } from "@/store/product";
import { useOrderStore } from "@/store/order";
import router from '@/router';

const queryString = ref("");
const isScrollingEnabled = ref(false);
const contentRef = ref(null as any);
const infiniteScrollRef = ref(null as any);

const products = computed(() => useProductStore().getProducts);
const isScrollable = computed(() => useProductStore().isScrollable);

const enableScrolling = () => {
  const parentElement = contentRef.value?.$el;
  if (!parentElement) return;
  const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']");
  if (!scrollEl) return;

  let scrollHeight = scrollEl.scrollHeight, infiniteHeight = infiniteScrollRef.value?.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight;
  const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height;
  if(distanceFromInfinite < 0) {
    isScrollingEnabled.value = false;
  } else {
    isScrollingEnabled.value = true;
  }
};

async function getProducts(vSize?: any, vIndex?: any) {
  const viewSize = vSize ? vSize : (import.meta.env.VITE_VIEW_SIZE as any);
  const viewIndex = vIndex ? vIndex : 0;
  const payload = {
    viewSize,
    viewIndex,
    queryString: queryString.value,
  };
  await useProductStore().findProduct(payload);
}

const loadMoreProducts = async (event: any) => {
  // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
  if(!(isScrollingEnabled.value && isScrollable.value)) {
    await event.target.complete();
  }
  const viewSize = (import.meta.env.VITE_VIEW_SIZE as any);
  await getProducts(
    undefined,
    Math.ceil(
      products.value.list?.length / viewSize
    ).toString()
  );
  await event.target.complete();
};

const selectSearchBarText = (event: any) => {
  event.target.getInputElement().then((element: any) => {
    element.select();
  });
};

const viewProduct = async (product: any) => {
  await useProductStore().addProductToCache(product);
  router.push({ path: `/product-detail/${product.productId}` });
};

onIonViewWillEnter(() => {
  // Clearing the current order as to correctly display the selected segment when moving to list page
  useOrderStore().updateCurrent({ order: {} });
  isScrollingEnabled.value = false;
  queryString.value = products.value.queryString;
  getProducts();
});
</script>
<style scoped>
main {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  align-items: start;
}
</style>
