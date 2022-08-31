<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="getProduct(item.productId).mainImageUrl" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h5>{{ getProduct(item.productId).brandName }}</h5>
      <h2>{{ getProduct(item.productId).productName }}</h2>
      <p class="ion-text-wrap">{{ getProduct(item.productId).internalName }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.productId).goodIdentifications, goodIdentificationTypeId) }}</p>
      <p v-if="$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')">{{ $t("Color") }}: {{ $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/') }}</p>
      <p v-if="$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')">{{ $t("Size") }}: {{ $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/') }}</p>
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
