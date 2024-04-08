<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
      <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
    </ion-label>
    <!-- Only show stock if its not a ship to store order -->
    <div v-if="!isShipToStoreOrder">
      <ion-note v-if="getProductStock(item.productId).quantityOnHandTotal >= 0" :color="updateColor(getProductStock(item.productId).quantityOnHandTotal)">
        {{ getProductStock(item.productId).quantityOnHandTotal }} {{ translate('pieces in stock') }}
      </ion-note>
      <ion-spinner v-else-if="isFetchingStock" color="medium" name="crescent" />
      <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId)">
        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
      </ion-button>
    </div>
  </ion-item>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { IonButton, IonIcon, IonItem, IonLabel, IonNote, IonSpinner, IonThumbnail } from "@ionic/vue";
import { mapGetters, useStore } from 'vuex';
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import { cubeOutline } from 'ionicons/icons'

export default defineComponent({
  name: "ProductListItem",
  components: {
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonThumbnail,
    DxpShopifyImg
  },
  data () {
    return {
      goodIdentificationTypeId: process.env.VUE_APP_PRDT_IDENT_TYPE_ID,
      isFetchingStock: false
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
  },
  methods: {
    async fetchProductStock(productId: string) {
      this.isFetchingStock = true
      await this.store.dispatch('stock/fetchStock', { productId })
      this.isFetchingStock = false
    },
    updateColor(stock: number) {
      return stock ? stock < 10 ? 'warning' : 'success' : 'danger';
    }
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    return {
      getProductIdentificationValue,
      productIdentificationPref,
      cubeOutline,
      store,
      translate
    }
  }
})
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}
</style>
