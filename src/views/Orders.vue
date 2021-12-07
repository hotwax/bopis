<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar :placeholder="$t('Search Orders')"></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="segmentName" >
          <ion-segment-button value="open">
            <ion-label>{{ $t("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packed">
            <ion-label>{{ $t("Packed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="segmentName == 'open'">
        
        <OrderItemCard v-for="order in orders" :key="order.orderId" :order="order" />
             
      </div>      
      <div v-if="segmentName == 'packed'">
        <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h1>Customer Name</h1>
                <p>Customer Id</p>
              </ion-label>
              <ion-note>
                <p>order time delta</p>
                <p>packed time delta</p>
              </ion-note>
            </ion-item>  
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="'https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg'" />
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
            <ion-item lines="full">
              <ion-thumbnail slot="start">
                <Image :src="'https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg'" />
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>phone number</ion-label>
              <ion-button fill="outline" slot="end" color="medium">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>email</ion-label>
              <ion-button fill="outline" slot="end" color="medium">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
          </ion-list>
          <ion-button fill="clear">
            {{ $t("Handover") }}
          </ion-button>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import Image from './../components/Image.vue'
import OrderItemCard from './../components/OrderItemCard.vue'
import { swapVerticalOutline, callOutline, mailOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    Image,
    OrderItemCard
  },
  computed: {
    ...mapGetters({
      orders: 'orders/getOrders',
      currentFacilityId: 'user/getCurrentFacility'
    })
  },
  methods: {
    async getOrders(vSize: any, vIndex: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        sortBy: 'orderDate',
        sortOrder: 'Desc',
        viewSize: vSize,
        viewIndex: vIndex,
        facilityId: this.currentFacilityId.facilityId
      }
      await this.store.dispatch("orders/getOrder", payload);
    }
  },
  mounted(){
      this.getOrders(process.env.VUE_APP_VIEW_SIZE,0);
  },
  setup() {
    const segmentName = ref("open");
    const store = useStore(); 

    return {
      callOutline,
      mailOutline,
      segmentName,
      swapVerticalOutline,
      store
    };
  },
});
</script>