<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar @ionFocus="selectSearchBarText($event)" v-model="queryString" :placeholder="$t('Search')" v-on:keyup.enter="getOrderdetails()"></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment @ionChange="segmentChanged($event)" v-model="segment">
          <ion-segment-button value="open">
            <ion-label>{{ $t("OPEN") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packedorders">
            <ion-label>{{ $t("PACKED") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <div v-if="segment == 'open'">
        <product-list-item v-for="product in products" :key="product.productId" :product="product"/>
         <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" :disabled="!isScrollable">
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonPage, IonSearchbar, IonSegment, IonSegmentButton,  IonTitle, IonToolbar } from '@ionic/vue';
import { swapVerticalOutline } from 'ionicons/icons'
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { mapGetters } from 'vuex';
import ProductListItem from "@/components/ProductListItem.vue";
import { translate } from '@/i18n'
import { showToast } from '@/utils'

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonButtons, 
    IonContent,
    IonHeader,
    IonIcon, 
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonLabel,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    ProductListItem
  },
  data (){
    return {
      queryString: ''
    }
  },
  methods: {
    async getOrderdetails (vSize: any, vIndex: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
      sortBy: 'orderDate',
      sortOrder: 'Desc',
      viewSize: viewSize,
      viewIndex: viewIndex,
      facilityId: 'STORE_8'
    };
      await this.store.dispatch('product/getOrderdetails',  payload);
    },
    async getPackedOrders (vSize: any, vIndex: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
      sortBy: 'createdDate',
      sortOrder: 'Desc',
      viewSize: viewSize,
      viewIndex: viewIndex,
      facilityId: 'STORE_8'
    };
      await this.store.dispatch('product/getPackedOrders',  payload);
    },
    async quickShipEntireShipGroup (vSize: any, vIndex: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
      orderId: "NN11843",
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: "STORE_8",
      shipGroupSeqId: "00001"
    };
      await this.store.dispatch('product/quickShipEntireShipGroup',  payload);
    },
    async loadMoreOrders (event: any) {
      this.getOrderdetails(
        undefined,
        Math.ceil(this.products.length / process.env.VUE_APP_VIEW_SIZE).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    segmentChanged(ev: CustomEvent) {
      this.segment = ev.detail.value;
    },
    selectSearchBarText(event: any) {
      event.target.getInputElement().then((element: any) => {
        element.select();
      })
    },
    
  },
  computed: {
    ...mapGetters({
      products: "product/getOrderdetails",
      packedOrders: "product/getPackedOrders",
      EntireShipGroup:"product/quickShipEntireShipGroup",
      isScrollable: "product/isScrollable"
    })
  },
   mounted() {
    this.getOrderdetails(null, null);
    this.getPackedOrders(null, null);
    this.quickShipEntireShipGroup(null, null);
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const segment = ref("open");
    return {
      segment,
      router,
      store,
      swapVerticalOutline
    };
  }
});
</script>