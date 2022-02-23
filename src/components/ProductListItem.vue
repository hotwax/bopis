<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="item.images?.main.thumbnail ? item.images?.main.thumbnail : getProduct(item.productId).mainImageUrl" />
    </ion-thumbnail>
    <ion-label>
      <h5>{{ item.brandName }}</h5>
      <h2>{{ item.itemName ? item.itemName : item.parentProductName }}</h2>
      <p class="ion-text-wrap">{{ item.itemId ? getProduct(item.itemId).internalName : item.internalName }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.itemId ? item.itemId : item.productId).goodIdentifications, goodIdentificationTypeId) }}</p>

      <p v-if="item.standardFeatures?.COLOR || item.productId">{{ $t("Color") }}: {{ item.standardFeatures?.COLOR.description || $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/') }}</p>
      <p v-if="item.standardFeatures?.COLOR || item.productId">{{ $t("Size") }}: {{ item.standardFeatures?.SIZE.description || $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/') }}</p>
    </ion-label>
    <ion-note slot = "end">{{ getProductStock(item.itemId ? item.itemId : item.productId) }} {{ $t("in stock") }}</ion-note>
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
