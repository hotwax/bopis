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
      <ion-spinner v-if="isFetchingStock" color="medium" name="crescent" />
      <div v-else-if="getInventoryInformation(item.productId).onlineAtp >= 0" class="atp-info">
        <ion-note slot="end"> {{ getInventoryInformation(item.productId).onlineAtp ?? '0' }} </ion-note>
        <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event)">
          <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
        </ion-button>
      </div>
      <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId)">
        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
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
    }
  },
  props: ['item', 'isShipToStoreOrder'],
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      product: "product/getCurrent",
      getInventoryInformation: 'stock/getInventoryInformation',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  methods: {
    async fetchProductStock(productId: string) {
      this.isFetchingStock = true
      await this.store.dispatch('stock/fetchInventoryCount', { productId });
      this.isFetchingStock = false
    },
    async openInventoryDetailPopover(Event: any){
      const popover = await popoverController.create({
        component: InventoryDetailsPopover,
        event: Event,
        componentProps: { item: this.item }
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

.atp-info {
  display: flex;
  align-items: center; 
  flex-direction: row; 
}
</style>
