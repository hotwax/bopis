<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Order item rejection history") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item v-for="(item, index) in orderRejectionHistory" :key="index">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label>
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) }}</h2>
          <h5>{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</h5>
        </ion-label>
        <ion-label slot="end" class="ion-text-right">
          <h2>{{ getRejectReasonDescription(item.changeReasonEnumId) }}</h2>
          <p>{{ item.changeUserLogin }}</p>
          <p>{{ getTime(item.changeDatetime) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div v-if="!orderRejectionHistory.length && !isLoading" class="empty-state">
      <p>{{ translate('No records found.') }}</p>
    </div>
  </ion-content>
</template>
  
<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { computed, defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { getProductIdentificationValue, translate, useProductIdentificationStore, DxpShopifyImg } from '@hotwax/dxp-components';

export default defineComponent({
  name: "OrderItemRejHistoryModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
    DxpShopifyImg
  },
  data () {
    return {
      isLoading: true
    }
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct',
      order: "order/getCurrent",
      rejectReasons: 'util/getRejectReasons',
      orderRejectionHistory: 'order/getOrderItemRejectionHistory'
    })
  },
  async mounted() {
    await this.store.dispatch('order/getOrderItemRejectionHistory', { orderId: this.order.orderId, rejectReasonEnumIds: this.rejectReasons.reduce((enumIds: [], reason: any) => [...enumIds, reason.enumId], []) });
    this.isLoading = false;
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    getRejectReasonDescription(rejectReasonEnumId: string) {
      return this.rejectReasons.find((reason: any) => reason.enumId === rejectReasonEnumId)?.description;
    },
    getTime(time: number) {
      return time ? DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED) : ''
    }
  },
  setup() {
    const store = useStore();

    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      closeOutline,
      getProductIdentificationValue,
      productIdentificationPref,
      store,
      translate
    };
  },
});
</script>