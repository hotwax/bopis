<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
     <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getProducts()"/>
      <main>
        <ion-card v-for="product in products" :key="product">
          <Image :src="product.mainImageUrl" />
          <ion-item lines="none">
            <ion-label>
              <p>{{ product.productId }}</p>
              {{ product.productName }}
              <p>${{ product.groupPrice }}</p>
            </ion-label>
          </ion-item>
        </ion-card>
      </main>
      <ion-infinite-scroll
        @ionInfinite="loadMoreProducts($event)"
        threshold="100px"
        :disabled="false"
      >
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="$t('Loading')"
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
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { showToast } from '@/utils'
import { translate } from '@/i18n'
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
      count:0
    };
  },
  computed: {
    ...mapGetters({
      products: "product/findProduct",
      isScrollable: "product/isScrollable",
    }),
  },
  methods: {
        selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    async loadMoreProducts(event: any) {
      console.log(this.count);
      this.count+=10;
      
      this.getProducts(
        undefined,
        Math.ceil(
          this.products.length / process.env.VUE_APP_VIEW_SIZE
        ).toString()
      ).then(() => {
        event.target.complete();
      });
    },
    async getProducts(vSize?: any, vIndex?: any) {
    
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        "json": {
            "params": {
                "q.op": "AND",
                "qf": "sku productId productName",
                "defType" : "edismax",
                "rows":10,
                "start":viewIndex*10,
            },
           "query": `(*${this.queryString}*) OR "${this.queryString}"^100`,
           "filter": "docType:PRODUCT",
          },
        
        }  
   
        await this.store.dispatch("product/findProduct", payload);
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
