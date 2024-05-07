<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
      <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
      <p>Color: color</p>
      <p>Size: size</p>
    </ion-label>
    <!-- Only show stock if its not a ship to store order -->
    <div v-if="!isShipToStoreOrder">
      <ion-note v-if="showInfoIcon"> 50 ATP </ion-note>
      <ion-spinner v-else-if="isFetchingStock" color="medium" name="crescent" />
      <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId)">
        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline"/>
      </ion-button>
      <ion-button v-if="showInfoIcon" fill="clear" @click.stop="getInventoryComputationDetails">
        <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium"></ion-icon>
      </ion-button>
    </div>
  </ion-item>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { IonButton, IonIcon, IonItem, IonLabel, IonNote, IonSpinner, IonThumbnail, popoverController } from "@ionic/vue";
import { mapGetters, useStore } from 'vuex';
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import { cubeOutline, informationCircleOutline } from 'ionicons/icons'
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'

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
      isFetchingStock: false,
      showInfoIcon: false
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
      this.showInfoIcon = true;
    },
    async getInventoryComputationDetails(){
      const popover = await popoverController.create({
        component: InventoryDetailsPopover,
        // componentProps: { otherStoresInventory: this.otherStoresInventoryDetails }
      });
      await popover.present();

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
      informationCircleOutline,
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
