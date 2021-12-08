<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
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
      <div v-if="segmentSelected === 'open'">
        <OrderItemCard v-for="order in orders" :key="order.orderId" :order="order">
          <template #packedTime>
            <p></p>
          </template>
          <template #cardBottomButton>
            <ion-button fill="clear" @click="readyForPickup(order)">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </template>
        </OrderItemCard>     
      </div>      
      <div v-if="segmentSelected === 'packed'">
        <OrderItemCard v-for="order in packedOrders" :key="order.orderId" :order="order">
          <template #cardBottomButton>
            <ion-button fill="clear" @click="handover(order)">
              {{ $t("Handover") }}
            </ion-button>
          </template>
        </OrderItemCard>
        <!-- <ion-card>
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
        </ion-card> -->
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonButton,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import OrderItemCard from './../components/OrderItemCard.vue'
import { swapVerticalOutline, callOutline, mailOutline } from "ionicons/icons";
import { mapGetters, useStore } from 'vuex'

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonLabel,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    OrderItemCard
  },
  computed: {
    ...mapGetters({
      orders: 'orders/getOrders',
      packedOrders: 'orders/getPackedOrders',
      currentFacilityId: 'user/getCurrentFacility'
    })
  },
  methods: {
    async getPickupOrders(vSize?: any, vIndex?: any){
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        sortBy: 'orderDate',
        sortOrder: 'Desc',
        viewSize,
        viewIndex,
        facilityId: this.currentFacilityId.facilityId
      }
      await this.store.dispatch("orders/getOrder", payload);
    },
    async getPackedOrders(vSize?: any, vIndex?: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      const payload = {
        sortBy: 'createdDate',
        sortOrder: 'Desc',
        viewSize,
        viewIndex,
        facilityId: this.currentFacilityId.facilityId
      };
      await this.store.dispatch("orders/getPackedOrders", payload);
    },
    async readyForPickup(order: any) {
      const alert = await alertController
        .create({
          header: 'Ready For Pickup',
          message: `An email notification will be sent to ${order.customerName} that their order is ready for pickup.<br/> <br/> This order will also be moved to the packed orders tab.`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              handler: blah => {
                console.log('Confirm Cancel:', blah)
              },
            },
            {
              text: 'Ready For Pickup',
              handler: (order) => {
                console.log('Confirm Okay')
              },
            },
          ],
        });
      return alert.present();
    },
    async handover(order: any) {
      const alert = await alertController
        .create({
          header: 'Handover',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              handler: blah => {
                console.log('Confirm Cancel:', blah)
              },
            },
            {
              text: 'Handover',
              handler: (order) => {
                console.log('Confirm Okay')
              },
            },
          ],
        });
      return alert.present();
    },
    segmentChanged (e: CustomEvent) {
      this.segmentSelected = e.detail.value
      this.segmentSelected === 'open' ? this.getPickupOrders() : this.getPackedOrders();
    }
  },
  ionViewWillEnter () {
    this.segmentSelected === 'open' ? this.getPickupOrders() : this.getPackedOrders();
  },
  setup() {
    const store = useStore();
    const segmentSelected = ref('open');

    return {
      callOutline,
      mailOutline,
      segmentSelected,
      swapVerticalOutline,
      store
    };
  },
});
</script>