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
      <ion-item v-for="(history, index) in rejectionHistory" :key="index">
        <ion-thumbnail slot="start">
          <ShopifyImg :src="getProduct(history.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label>
          <h5>{{ getProduct(history.productId).brandName }}</h5>
          <h2>{{ getProduct(history.productId).productName }}</h2>
          <p v-if="$filters.getFeature(getProduct(history.productId).featureHierarchy, '1/COLOR/')">{{ translate("Color") }}: {{ $filters.getFeature(getProduct(history.productId).featureHierarchy, '1/COLOR/') }}</p>
          <p v-if="$filters.getFeature(getProduct(history.productId).featureHierarchy, '1/SIZE/')">{{ translate("Size") }}: {{ $filters.getFeature(getProduct(history.productId).featureHierarchy, '1/SIZE/') }}</p>
        </ion-label>
        <ion-label slot="end" class="ion-text-right">
          <h2>{{ getRejectReasonDescription(history?.changeReasonEnumId) }}</h2>
          <p>{{ history?.changeUserLogin }}</p>
          <p>{{ getTime(history.changeDatetime) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div v-if="!rejectionHistory.length && !isLoading" class="empty-state">
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
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { translate } from '@hotwax/dxp-components';

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
      rejectionHistory: 'order/getOrderItemRejectionHistory'
    })
  },
  async mounted() {
    await this.store.dispatch('order/getOrderItemRejHistory', { orderId: this.order.orderId, rejectReasonEnumIds: this.rejectReasons.reduce((enumIds: [], reason: any) => [...enumIds, reason.enumId], []) });
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
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED)
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store,
      translate
    };
  },
});
</script>