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
        <ion-list v-if="orders.length > 0">
          <order-details v-for="order in orders" :key="order.orderId" :order="order"/>
        </ion-list>
        <ion-infinite-scroll @ionInfinite="loadMoreOrders($event)" threshold="100px" >
          <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonLabel, IonList, IonPage, IonSearchbar, IonSegment, IonSegmentButton,  IonTitle, IonToolbar } from '@ionic/vue';
import { swapVerticalOutline } from 'ionicons/icons'
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { mapGetters } from 'vuex';
import OrderDetails from "@/components/OrderDetails.vue";

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
    IonList,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    OrderDetails
  },
  data (){
    return {
      queryString: ''
    }
  },
  methods: {
    async getOrderdetails (vSize?: any, vIndex?: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
      sortBy: 'orderDate',
      sortOrder: 'Desc',
      viewSize: viewSize,
      viewIndex: viewIndex,
      facilityId: this.currentFacility.facilityId
    };
      await this.store.dispatch('order/getOrderdetails',  payload);
    },
    async loadMoreOrders (event: any) {
      this.getOrderdetails(
        undefined,
        Math.ceil(this.orders.length / process.env.VUE_APP_VIEW_SIZE).toString()
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
      orders: "order/getOrderdetails",
      currentFacility: 'user/getCurrentFacility'
    })
  },
   mounted() {
    this.getOrderdetails();
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