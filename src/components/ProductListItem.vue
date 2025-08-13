<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
    </ion-thumbnail>
    <ion-label class="ion-text-wrap">
      <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
      <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
      <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
    </ion-label>
    <!-- Only show stock if its not a ship to store order -->
    <div class="show-kit-components" slot="end" v-if="!isShipToStoreOrder">
      <ion-spinner v-if="isFetchingStock" color="medium" name="crescent" />
      <div v-else-if="getProductStock(item.productId).quantityOnHandTotal >= 0" class="atp-info">
        <ion-note slot="end"> {{ translate("on hand", { count: getProductStock(item.productId).quantityOnHandTotal ?? '0' }) }} </ion-note>
        <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event)">
          <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
        </ion-button>
      </div>
      <ion-button  data-testid="qoh-button" v-else fill="clear" @click.stop="fetchProductStock(item.productId)">
        <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
      </ion-button>

      <ion-button data-testid="gift-card-activation-button" color="medium" fill="clear" size="small" v-if="(orderType === 'packed' || orderType === 'completed') && item.productTypeId === 'GIFT_CARD'" @click.stop="openGiftCardActivationModal(item)">
        <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
      </ion-button>
      
      <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
        <ion-icon v-if="showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
        <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
      </ion-button>

    </div>  
  </ion-item>

  <template v-if="showKitComponents && !getProduct(item.productId)?.productComponents">
    <ion-item lines="none">
      <ion-skeleton-text animated style="height: 80%;"/>
    </ion-item>
    <ion-item lines="none">
      <ion-skeleton-text animated style="height: 80%;"/>
    </ion-item>
  </template>
  <template v-else-if="showKitComponents && getProduct(item.productId)?.productComponents">
    <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
        </ion-thumbnail>
        <ion-label>
          <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
          {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
        </ion-label>
      </ion-item>
    </ion-card>
  </template>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { IonBadge, IonButton, IonCard, IonIcon, IonItem, IonLabel, IonNote, IonSkeletonText, IonSpinner, IonThumbnail, popoverController, modalController } from "@ionic/vue";
import { mapGetters, useStore } from 'vuex';
import { getProductIdentificationValue, DxpShopifyImg, translate, useProductIdentificationStore } from '@hotwax/dxp-components'
import { chevronUpOutline, cubeOutline, informationCircleOutline, listOutline, gift, giftOutline } from 'ionicons/icons'
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { isKit } from '@/utils/order'

export default defineComponent({
  name: "ProductListItem",
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonSkeletonText,
    IonSpinner,
    IonThumbnail,
    DxpShopifyImg
  },
  data () {
    return {
      isFetchingStock: false,
      showKitComponents: false
    }
  },
  props: ['item', 'isShipToStoreOrder', 'orderId', 'orderType', 'customerId'],
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      product: "product/getCurrent",
      getProductStock: 'stock/getProductStock',
    })
  },
  methods: {
    async fetchKitComponents(orderItem: any) {
      this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })
      this.showKitComponents = !this.showKitComponents
    },
    async fetchProductStock(productId: string) {
      this.isFetchingStock = true
      await this.store.dispatch('stock/fetchStock', { productId });
      this.isFetchingStock = false
    },
    async openInventoryDetailPopover(Event: any){
      const popover = await popoverController.create({
        component: InventoryDetailsPopover,
        event: Event,
        showBackdrop: false,
        componentProps: { item: this.item }
      });
      await popover.present();
    },
    updateColor(stock: number) {
      return stock ? stock < 10 ? 'warning' : 'success' : 'danger';
    },
    async openGiftCardActivationModal(item: any) {
      const modal = await modalController.create({
        component: GiftCardActivationModal,
        componentProps: { item, orderId: this.orderId, customerId: this.customerId }
      })
      modal.onDidDismiss().then((result: any) => {
        if(result.data?.isGCActivated) {
          this.store.dispatch("order/updateCurrentItemGCActivationDetails", { item, orderId: this.orderId, orderType: this.orderType, isDetailsPage: false })
        }
      })
      modal.present();
    }
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    return {
      chevronUpOutline,
      getProductIdentificationValue,
      productIdentificationPref,
      cubeOutline,
      informationCircleOutline,
      gift,
      giftOutline,
      isKit,
      listOutline,
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
.show-kit-components {
  justify-items: end;
}
</style>
