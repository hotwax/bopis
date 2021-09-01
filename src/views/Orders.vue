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
        <ion-searchbar placeholder="Search orders"></ion-searchbar>
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
      <product-list-item v-for="product in products" :key="product.productId" :product="product"/>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonPage, IonSearchbar, IonSegment, IonSegmentButton,  IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router'
import { useStore } from 'vuex';
import { mapGetters } from 'vuex';
import ProductListItem from "@/components/ProductListItem.vue";


export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonButtons, 
    IonContent,
    IonHeader,
    IonIcon, 
    IonLabel,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    ProductListItem
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
    segmentChanged(ev: CustomEvent) {
      this.segment = ev.detail.value;
    },
  },
  computed: {
    ...mapGetters({
      products: "product/getOrderdetails"
    })
  },
   mounted() {
    this.getOrderdetails(10,0)
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    const segment = ref("open");
    return {
      segment,
      router,
      store
    };
  }
});
</script>