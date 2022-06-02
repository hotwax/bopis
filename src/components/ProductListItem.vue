<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="item.product.mainImage" />
    </ion-thumbnail>
    <ion-label>
      <h5>{{ item.product.brand }}</h5>
      <h2>{{ item.product.name }}</h2>
      <p class="ion-text-wrap">{{ getProduct(item.product.id).internalName }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.product.id).goodIdentifications, goodIdentificationTypeId) }}</p>
      <p v-if="item.product.feature.COLOR">{{ $t("Color") }}: {{ item.product.feature.COLOR.description }}</p>
      <p v-if="item.product.feature.SIZE">{{ $t("Size") }}: {{ item.product.feature.SIZE.description }}</p>
    </ion-label>
    <ion-note slot = "end">{{ getProductStock(item.itemId) }} {{ $t("in stock") }}</ion-note>
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
