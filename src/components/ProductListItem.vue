<template>
  <ion-card>
    <ion-item lines="none" >
      <ion-label>
        <h1>{{product.customerName}}</h1>
        <p>{{product.orderId}}</p>
      </ion-label>
      <ion-note slot="end">{{ product.orderDate }}</ion-note>
    </ion-item>
    <ion-item lines="full" >
      <ion-thumbnail slot="start">
        <img :src="product.items[0].images.main.thumbnail"/>
      </ion-thumbnail>
      <ion-label>
        <h2>{{ product.items[0].brandName }}</h2>
        <h2>{{ product.items[0].itemName }}</h2>
        <p>{{ $t("Color") }}: {{ product.items[0].standardFeatures.COLOR.description }}</p>
        <p>{{ $t("Size") }}: {{ product.items[0].standardFeatures.SIZE.description }}</p>
      </ion-label>
      <ion-note color="success" slot="end">{{ product.items[0].inventory[0].quantity }} {{ $t("in stock") }}</ion-note>
    </ion-item>
    <!-- TODO: We can add the Contact details of the Customer -->
    <ion-button fill="clear">{{ $t("READY FOR PICKUP") }}</ion-button>
  </ion-card>
</template>


<script lang="ts">
import { IonButton, IonCard, IonItem, IonLabel, IonNote, IonThumbnail } from '@ionic/vue';
import { defineComponent } from 'vue';

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
  props:['product']
});
</script>