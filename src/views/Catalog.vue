<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-searchbar v-model="queryString" />
      <main>
        <ion-card v-for="items in products" :key="items">
          <Image :src="items.mainImageUrl" />
          <ion-item lines="none">
            {{ items.p }}
            <ion-label>
              <p>{{ items.productId }}</p>
              {{ items.productName }}
              <p>${{ items.groupPrice }}</p>
            </ion-label>
          </ion-item>
        </ion-card>
      </main>
      {{ isScrollable }}
      <ion-infinite-scroll
        @ionInfinite="loadMoreProducts($event)"
        threshold="100px"
        :disabled="false">
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="$t('Loading')"></ion-infinite-scroll-content>
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
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import Image from "../components/Image.vue";

export default defineComponent({
  name: "Catalog",
  components: {
    Image,
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
  },
  data() {
    return {
      queryString: "",
    };
  },
  computed: {
    ...mapGetters({
      products: "product/findProduct",
      isScrollable: "product/isScrollable",
    }),
  },
  methods: {
    async loadMoreProducts(event: any) {

      this.getProducts(
        undefined,
        Math.ceil(
          this.products.length / process.env.VUE_APP_VIEW_SIZE
        ).toString()
      ).then(() => {
        event.target.complete();
      });
    },
    async getProducts(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        viewSize,
        viewIndex,
        queryString: "*" + this.queryString + "*",
      };
      // if (this.queryString) {
      await this.store.dispatch("product/findProduct", payload);
      // } else {
      // showToast(translate("Enter product sku to search"))
      // }
    },
  },

  async mounted() {
    this.getProducts(process.env.VUE_APP_VIEW_SIZE, 0);
  },
  setup() {
    const store = useStore();

    return {
      store,
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
