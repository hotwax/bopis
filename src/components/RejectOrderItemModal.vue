<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Reject Order") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Warning banner if partial rejection is disabled and any item is marked for rejection -->
    <ion-item v-if="showRejectionWarning" lines="none" class="ion-item-banner ion-margin-vertical">
      <ion-icon :icon="warningOutline" slot="start" color="danger" />
      <ion-label class="ion-item-banner">
        {{ translate('Partial Order rejection is disabled') }}
      </ion-label>
    </ion-item>

    <div v-for="item in orderProps?.shipGroup?.items" :key="item.orderItemSeqId">
      <ion-item lines="none">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>

        <ion-label class="ion-text-wrap">
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId))|| getProduct(item.productId).productName }}
          </h2>
          <p>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
        </ion-label>

        <ion-select slot="end" placeholder="Reason" interface="popover" v-model="item.rejectReasonId" @ionChange="onReasonChange($event, item)">
          <ion-select-option v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId">{{ reason.description }}</ion-select-option>
        </ion-select>
      </ion-item>
    </div>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button color="danger" :disabled="!canConfirm" @click="confirmSave">
        <ion-icon :icon="trashOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonFab,
  IonFabButton,
  alertController,
  modalController,
} from '@ionic/vue';
import { closeOutline, warningOutline, trashOutline } from 'ionicons/icons';
import { defineComponent, computed } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { DxpShopifyImg, translate, getProductIdentificationValue, useProductIdentificationStore } from '@hotwax/dxp-components';
import { isKit } from '@/utils/order';
export default defineComponent({
  name: 'RejectOrderItemModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonFab,
    IonFabButton,
    DxpShopifyImg
  },
  props: {
    orderProps: {
      type: Object as () => {
        orderId: string;
        shipGroup?: {
          shipGroupSeqId: string;
          items?: any[];
        };
        [key: string]: any;
      },
      required: true
    }
  },
  data() {
    return {
      rejectEntireOrderReasonId: "REJ_AVOID_ORD_SPLIT"
    };
  },
  computed: {
    ...mapGetters({
      order: 'order/getCurrent',
      getProduct: 'product/getProduct',
      rejectReasons: 'util/getRejectReasons',
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
    }),
    isPartialRejectionEnabled(): boolean {
      const config = this.partialOrderRejectionConfig?.settingValue;
      return !!(config && JSON.parse(config));
    },
    showRejectionWarning(): boolean {
      const hasRejectedItems = !!this.orderProps?.shipGroup?.items?.some((item: any) => !!item.rejectReasonId);
      return !this.isPartialRejectionEnabled && hasRejectedItems;
    },
    canConfirm(): boolean {
      const items = this.orderProps?.shipGroup?.items;
      if (!items) return false;
      if (this.isPartialRejectionEnabled) {
        return items.some((item: any) => !!item.rejectReasonId);
      } else {
        return items.every((item: any) => !!item.rejectReasonId);
      }
    }
  },
  methods: {
   onReasonChange(event: any, selectedItem: any) {
     const selectedValue = event.detail.value;
     const items = this.orderProps?.shipGroup?.items;
     if (!this.isPartialRejectionEnabled && items) {
       items.forEach((item: any) => {
         item.rejectReasonId = item.orderItemSeqId === selectedItem.orderItemSeqId
           ? selectedValue
           : this.rejectEntireOrderReasonId;
        });
      } else {
        selectedItem.rejectReasonId = selectedValue;
      }
    },      
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async fetchRejectReasons() {
      await this.store.dispatch('util/fetchRejectReasons');
    },
    async confirmSave() {
      const alert = await alertController.create({
        header: translate('Reject Order'),
        message: translate('This order will be removed from your dashboard. This action cannot be undone.'),
        buttons: [
          {
            text: translate('Cancel'),
            role: 'cancel'
          },
          {
            text: translate('Reject'),
            handler: async () => {
              const updatedItems = (this.orderProps?.shipGroup?.items ?? []).map((item: any) => ({
                ...item,
                reason: item.rejectReasonId
              }));
              const shipGroup = { ...this.orderProps?.shipGroup, items: updatedItems };
              const resp = await this.store.dispatch('order/rejectItems', {
                orderId: this.orderProps?.orderId,
                shipGroup
              });
              if (resp) {
                // Update matching shipGroup in shipGroups list
                this.store.dispatch("order/removeOpenOrder", { order: this.orderProps, shipGroup })                
                this.closeModal();
              }
            }
          }
        ]
      });
      await alert.present();
    }
  },
  mounted() {
    this.fetchRejectReasons();
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref);
    return {
      closeOutline,
      warningOutline,
      trashOutline,
      store,
      translate,
      getProductIdentificationValue,
      isKit,
      productIdentificationPref
    };
  }
});
</script>

<style scoped>
.ion-item-banner{
  --background:#ED576B1A;
  --border-radius: 8px;
}
</style>
