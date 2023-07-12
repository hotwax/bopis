<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <ShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h5>{{ getProduct(item.productId).brandName }}</h5>
      <h2>{{ getProduct(item.productId).productName }}</h2>
      <p class="ion-text-wrap">{{ getProduct(item.productId).internalName }}</p>
      <p class="overline">{{ $filters.getIdentificationId(getProduct(item.productId).goodIdentifications, goodIdentificationTypeId) }}</p>
      <p v-if="$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/')">{{ $t("Color") }}: {{ $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/COLOR/') }}</p>
      <p v-if="$filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/')">{{ $t("Size") }}: {{ $filters.getFeature(getProduct(item.productId).featureHierarchy, '1/SIZE/') }}</p>
    </ion-label>
    <!-- Only show stock if its not a ship to store order -->
    <ion-note v-if="!isShipToStoreOrder" slot="end">{{ getProductStock(item.productId) }} {{ $t("in stock") }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import { mapGetters } from 'vuex';
import { ShopifyImg } from '@hotwax/dxp-components'

export default {
  components: {
    IonItem,
    IonLabel,
    IonNote,
    IonThumbnail,
    ShopifyImg
  },
  data () {
    return {
      goodIdentificationTypeId: process.env.VUE_APP_PRDT_IDENT_TYPE_ID
    }
  },
  props: {
    item: Object,
    isShipToStoreOrder: {
      type: Boolean,
      default: false
    }
  },
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
