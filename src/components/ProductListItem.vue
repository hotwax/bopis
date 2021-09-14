<template>
  <ion-card>
    <ion-item lines="none" >
      <ion-label>
        <h1>{{product.customerName}}</h1>
        <p>{{product.orderId}}</p>
      </ion-label>
      <ion-note slot="end">{{ product.orderDate }}</ion-note>
    </ion-item>
    <ion-item lines="full" v-for="item in product.items" :key="item.productId" :item="item" >
      <ion-thumbnail slot="start">
        <img :src="item.images.main.thumbnail"/>
      </ion-thumbnail>
      <ion-label>
        <h2>{{ item.brandName }}</h2>
        <h2>{{ item.itemName }}</h2>
        <p>{{ $t("Color") }}: {{ item.standardFeatures.COLOR.description }}</p>
        <p>{{ $t("Size") }}: {{ item.standardFeatures.SIZE.description }}</p>
      </ion-label>
      <!-- TODO: We can add here the number of product available in stock -->
    </ion-item>
    <!-- TODO: We can add the Contact details of the Customer -->
    <ion-button fill="clear" @click="quickShipEntireShipGroup(product, product.items[0].shipGroupSeqId)" >{{ $t("READY FOR PICKUP") }}</ion-button>
  </ion-card>
</template>

<script lang="ts">
import { IonButton, IonCard, IonItem, IonLabel, IonNote, IonThumbnail } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'ProductListItem',
  components: {
    IonButton,
    IonCard,
    IonItem,
    IonLabel, 
    IonNote,
    IonThumbnail,
  },
  methods:{
    async quickShipEntireShipGroup (order: any , shipGroupSeqId: any){
      const payload = {
      orderId: order.orderId,
      setPackedOnly: 'Y',
      dimensionUomId: 'WT_kg',
      shipmentBoxTypeId: 'YOURPACKNG',
      weight: '1',
      weightUomId: 'WT_kg',
      facilityId: "STORE_8",
      shipGroupSeqId: shipGroupSeqId
    };
      await this.store.dispatch('product/quickShipEntireShipGroup',  payload);
    },
  },
  props:['product'],
  setup() {
    const router = useRouter();
    const store = useStore();
    return {
      router,
      store
    }; 
  }
});
</script>