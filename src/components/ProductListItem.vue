<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="getProduct(item.productId).mainImageUrl" />
    </ion-thumbnail>
    <ion-label>
      <h5>{{ getProduct(item.productId).brandName }}</h5>
      <h2>{{ item.productName }}</h2>
      <p class="ion-text-wrap">{{ getProduct(item.productId).internalName }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.productId).goodIdentifications, goodIdentificationTypeId) }}</p>
      <!-- <p v-if="item.standardFeatures.COLOR">{{ $t("Color") }}: {{ item.standardFeatures.COLOR.description }}</p>
      <p v-if="item.standardFeatures.SIZE">{{ $t("Size") }}: {{ item.standardFeatures.SIZE.description }}</p> -->
    </ion-label>
    <ion-note slot = "end">{{ getProductStock(item.productId) }} {{ $t("in stock") }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import Image from './Image.vue'
import { mapGetters } from 'vuex';

export default {
  components: {
    Image,
    IonItem,
    IonLabel,
    IonNote,
    IonThumbnail
  },
  data () {
    return {
      goodIdentificationTypeId: process.env.VUE_APP_PRDT_IDENT_TYPE_ID
    }
  },
  props: ["item"],
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock'
    })
  }
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}
</style>
