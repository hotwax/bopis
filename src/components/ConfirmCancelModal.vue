<template>
  <ion-header data-testid="confirm-cancel-modal-header">
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Cancel items") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Summary") }}</ion-list-header>
      <ion-item v-for="(item, index) in cancelledItems" :key="index"  :lines="index === cancelledItems.length - 1 ? 'full' : 'inset'">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label class="ion-text-wrap">
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p class="ion-text-wrap">{{ getCancelReasonDescription(item.cancelReason) }}</p>
          <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
        </ion-label>
        <ion-note slot="end">{{ item.unitPrice ? formatCurrency(item.unitPrice, order.currencyUom) : "" }}</ion-note>
      </ion-item>

      <ion-item lines="full">
        <ion-label>{{ translate("Total") }}</ion-label>
        <ion-note slot="end">{{ formatCurrency(orderTotal, order.currencyUom) }}</ion-note>
      </ion-item>

      <ion-item lines="full" v-if="isCancelationSyncJobEnabled && isProcessRefundEnabled">
        <ion-label>
          {{ translate("Estimated time to refund customer on Shopify") }}
          <p>{{ translate("Showing the next estimated time to sync cancellation to Shopify") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else-if="isCancelationSyncJobEnabled">
        <ion-label>
          {{ translate("Estimated time to cancellation on Shopify") }}
          <p>{{ translate("Cancellation sync to Shopify is enabled. Refund processing is disabled.") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else>
        <ion-label>
          {{ translate("Cancellation not syncing to Shopify") }}
          <p>{{ translate("Cancellation and refund sync to Shopify is not enabled.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-button class="ion-margin" color="danger" @click="cancelOrder">
      {{ translate("Confirm Cancellation") }}
    </ion-button>
  </ion-content>
</template>
    
<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonThumbnail,
  IonToolbar,
  modalController,
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex"
import { OrderService } from "@/services/OrderService";
import { getProductIdentificationValue, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import { isKit } from "@/utils/order"
import { formatCurrency } from "@/utils";
import { hasError } from "@hotwax/oms-api";
import { DateTime } from "luxon";
import emitter from "@/event-bus";

export default defineComponent({
  name: "ConfirmCancelModal",
  components: {
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonTitle,
    IonThumbnail,
    IonToolbar
  },
  props: ["order", "isCancelationSyncJobEnabled", "isProcessRefundEnabled", "cancelJobNextRunTime", "orderType"],
  data() {
    return {
      cancelledItems: [] as Array<any>,
      orderTotal: 0,
      currentOrder: {} as any,
      runTimeDiff: ""
    }
  },
  computed: {
    ...mapGetters({
      getProduct: "product/getProduct",
      cancelReasons: "util/getCancelReasons",
      currency: "user/getCurrency"
    })
  },
  mounted() {
    this.currentOrder = JSON.parse(JSON.stringify(this.order))
    this.cancelledItems = this.currentOrder.shipGroup.items.filter((item: any) => item.cancelReason)
    this.orderTotal = this.cancelledItems.reduce((total: any, item: any) => this.getProduct(item.productId).LIST_PRICE_PURCHASE_USD_STORE_GROUP_price + total, 0)
    const timeDiff = DateTime.fromMillis(this.cancelJobNextRunTime).diff(DateTime.local());
    this.runTimeDiff = DateTime.local().plus(timeDiff).toRelative();
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    getCancelReasonDescription(cancelReasonId: string) {
      const reason = this.cancelReasons?.find((reason: any) => reason.enumId === cancelReasonId)
      return reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    async cancelOrder() {
      emitter.emit("presentLoader");

      const itemsPayload = this.cancelledItems.map((item: any) => ({
        orderItemSeqId: item.orderItemSeqId,
        shipGroupSeqId: item.shipGroupSeqId,
        reason: item.cancelReason,
        comment: item.comment || ''
      }));

      const payload = {
        orderId: this.currentOrder.orderId,
        items: itemsPayload
      };

      let cancelledResponse;
      let isCancelled = true;

      try {
        cancelledResponse = await OrderService.cancelOrder(payload);

        if (hasError(cancelledResponse)) {
          throw cancelledResponse.data;
        }

        // Remove the cancelled items from the order details page
        const cancelledItemSeqIds = new Set(itemsPayload.map(item => item.orderItemSeqId));
        this.currentOrder["shipGroup"] = {
          ...this.currentOrder.shipGroup,
          items: this.currentOrder.shipGroup.items.filter(
            (orderItem: any) => !cancelledItemSeqIds.has(orderItem.orderItemSeqId)
          )
        };
      } catch (err) {
        console.error("Error cancelling order items", err);
        isCancelled = false;
      }

      // If all the items are cancelled then mark the whole order as cancelled
      if (!this.currentOrder.shipGroup.items.length) {
        this.currentOrder.cancelled = true;
      }

      await this.store.dispatch("order/updateCurrent", { order: this.currentOrder });
      emitter.emit("dismissLoader");
      this.closeModal();
    }
  },
  setup() {
    const store = useStore();
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)

    return {
      closeOutline,
      isKit,
      formatCurrency,
      getProductIdentificationValue,
      productIdentificationPref,
      saveOutline,
      store,
      translate
    };
  }
});
</script>