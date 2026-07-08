<template>
  <ion-header data-testid="reject-order-modal-header">
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
          <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId))|| getProduct(item.productId).productName }}
          </h2>
          <p>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <ion-badge color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
        </ion-label>

        <ion-select data-testid="rejection-reason-modal-button" slot="end" placeholder="Reason" interface="popover" v-model="item.rejectReasonId" @ionChange="onReasonChange($event, item)">
          <ion-select-option data-testid="select-rejection-reason-option" v-for="reason in rejectReasons" :key="reason.enumId" :value="reason.enumId">{{ reason.enumDescription ?? reason.description }}</ion-select-option>
        </ion-select>
      </ion-item>
    </div>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button data-testid="reject-modal-button" color="danger" :disabled="!canConfirm" @click="confirmSave">
        <ion-icon :icon="trashOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, IonSelect, IonSelectOption, IonItem, IonThumbnail, IonLabel, IonFab, IonFabButton, IonBadge, alertController, modalController } from '@ionic/vue';
import { closeOutline, warningOutline, trashOutline } from 'ionicons/icons';
import { computed, onMounted, ref } from 'vue';
import { DxpShopifyImg, translate, commonUtil } from '@common';
import { useProductStore as useProductStoreSettings } from '@/store/productStore'
import { orderUtil } from '@/utils/orderUtil';
import { useOrderStore } from '@/store/order';
import { useProductStore as useProduct } from '@/store/product';
import { useUserStore } from '@/store/user';

const props = defineProps({
  orderProps: {
    type: Object as () => {
      orderId: string;
      orderName: string;
      shipGroup?: {
        shipGroupSeqId: string;
        items?: any[];
      };
      [key: string]: any;
    },
    required: true
  }
})

const orderStore = useOrderStore();
const userStore = useUserStore();

const rejectEntireOrderReasonId = ref("REJ_AVOID_ORD_SPLIT");

const getProduct = (productId: string) => useProduct().getProduct(productId);
const rejectReasons = computed(() => orderStore.getRejectReasons);
const isPartialOrderRejectionEnabled = computed(() => useProductStoreSettings().isPartialOrderRejectionEnabled);
const productIdentificationPref = computed(() => useProductStoreSettings().getProductIdentificationPref);

const showRejectionWarning = computed(() => {
  const hasRejectedItems = !!props.orderProps?.shipGroup?.items?.some((item: any) => !!item.rejectReasonId);
  return !isPartialOrderRejectionEnabled.value && hasRejectedItems;
});

const canConfirm = computed(() => {
  const items = props.orderProps?.shipGroup?.items;
  if (!items) return false;
  if (isPartialOrderRejectionEnabled.value) {
    return items.some((item: any) => !!item.rejectReasonId);
  } else {
    return items.every((item: any) => !!item.rejectReasonId);
  }
});

onMounted(() => {
  orderStore.fetchRejectReasons();
});

function onReasonChange(event: any, selectedItem: any) {
  const selectedValue = event.detail.value;
  const items = props.orderProps?.shipGroup?.items;
  if (!isPartialOrderRejectionEnabled.value && items) {
    items.forEach((item: any) => {
      item.rejectReasonId = item.orderItemSeqId === selectedItem.orderItemSeqId
        ? selectedValue
        : rejectEntireOrderReasonId.value;
    });
  } else {
    selectedItem.rejectReasonId = selectedValue;
  }
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

async function confirmSave() {
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
          const updatedItems = (props.orderProps?.shipGroup?.items ?? [])
            .filter((item: any) => item.rejectReasonId)
            .map((item: any) => ({
              ...item,
              maySplit: 'Y',
              reason: item.rejectReasonId
            }));
          const shipGroup = { ...props.orderProps?.shipGroup, items: updatedItems };
          const resp = await orderStore.rejectItems({
            orderId: props.orderProps?.orderId,
            orderName: props.orderProps?.orderName,
            shipGroup,
            isEntireOrderRejected: (props.orderProps?.shipGroup?.items?.length === updatedItems.length)
          });
            await orderStore.fetchOpenOrders({ viewSize: import.meta.env.VITE_VIEW_SIZE, viewIndex: 0, queryString: '', facilityId: (useProductStoreSettings().getCurrentFacility as any)?.facilityId });
          closeModal();              
        }
      }
    ]
  });
  await alert.present();
}
</script>

<style scoped>
.ion-item-banner{
  --background:#ED576B1A;
  --border-radius: 8px;
}
</style>
