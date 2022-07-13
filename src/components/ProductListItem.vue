<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="getProduct(item.productId).images?.mainImageUrl" />
    </ion-thumbnail>
    <ion-label>
      <!-- TODO: add brandName support -->
      <h5>{{ getProduct(item.productId).brandName }}</h5>
      <h2>{{ getProduct(item.productId).productName }}</h2>
      <p class="ion-text-wrap">{{ getProduct(item.productId).pseudoId }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.productId).goodIdentifications, goodIdentificationTypeId) }}</p>
      <p v-if="getFeature(getProduct(item.productId).features, 'Color')">{{ $t("Color") }}: {{ getFeature(getProduct(item.productId).features, 'Color') }}</p>
      <p v-if="getFeature(getProduct(item.productId).features, 'Size')">{{ $t("Size") }}: {{ getFeature(getProduct(item.productId).features, 'Size') }}</p>
    </ion-label>
    <ion-note slot = "end">{{ getProductStock(item.productId) }} {{ $t("in stock") }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import Image from './Image.vue'
import { mapGetters } from 'vuex';
import { getFeature } from '@/utils'

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
  },
  setup() {
    return {
      getFeature
    }
  }
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}
</style>
