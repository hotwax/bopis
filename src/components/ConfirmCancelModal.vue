<template>
  <ion-header>
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
      <ion-item v-for="(item, index) in cancelledItems" :key="index">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
        </ion-thumbnail>
        <ion-label class="ion-text-wrap">
          <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
          <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
          <p class="ion-text-wrap">{{ getCancelReasonDescription(item.cancelReason) }}</p>
          <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
        </ion-label>
        <ion-note slot="end">{{ getProduct(item.productId).LIST_PRICE_PURCHASE_USD_STORE_GROUP_price ? getProduct(item.productId).LIST_PRICE_PURCHASE_USD_STORE_GROUP_price : "" }}</ion-note>
      </ion-item>

      <ion-item lines="full">
        <ion-label>{{ translate("Total") }}</ion-label>
        <ion-note slot="end">{{ orderTotal }}</ion-note>
      </ion-item>

      <ion-item lines="full" v-if="isCancelationSyncJobEnabled && isProcessRefundEnabled">
        <ion-label>
          {{ translate("Estimated time to refund customer on Shopify") }}
          <p>{{ translate("Showing the next estimated time to sync cancelation to Shopify") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else-if="isCancelationSyncJobEnabled">
        <ion-label>
          {{ translate("Estimated time to cancelation on Shopify") }}
          <p>{{ translate("Showing the next estimated time to sync cancelation to Shopify") }}</p>
          <p>{{ translate("Cancelation sync to Shopify is enabled. Refund processing is disabled.") }}</p>
        </ion-label>
        <ion-note slot="end">{{ runTimeDiff }}</ion-note>
      </ion-item>
      <ion-item lines="full" v-else>
        <ion-label>
          {{ translate("Cancelation not syncing to Shopify") }}
          <p>{{ translate("Cancelation and refund sync to Shopify is not enabled.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-button class="ion-margin" color="danger" @click="cancelOrder">
      {{ translate("Confirm Cancelation") }}
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
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import { isKit } from "@/utils/order"
import { showToast } from "@/utils";
import { hasError } from "@hotwax/oms-api";
import { DateTime } from "luxon";

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
    this.cancelledItems = this.currentOrder.part.items.filter((item: any) => item.cancelReason)
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
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    async cancelOrder() {
      let isCancelled = true
      for (const item of this.cancelledItems) {
        const params = {
          orderId: this.currentOrder.orderId,
          orderItemSeqId: item.orderItemSeqId,
          shipGroupSeqId: item.shipGroupSeqId,
          cancelQuantity: item.quantity ? parseInt(item.quantity) : 1,
          [`irm_${item.orderItemSeqId}`]: item.cancelReason
        }

        try {
          const resp = await OrderService.cancelItem(params);

          if(hasError(resp)) {
            throw resp.data
          } else {
            this.currentOrder["part"] = {
              ...this.currentOrder.part,
              items: this.currentOrder.part.items.filter((orderItem: any) => !(orderItem.orderItemSeqId === item.orderItemSeqId && orderItem.productId === item.productId))
            }
          }
        } catch(err) {
          isCancelled = false
        }
      }
      
      // If all the items are cancelled then marking the whole order as cancelled
      if(!this.currentOrder.part.items.length) {
        this.currentOrder.cancelled = true;
      } else {
        // If we have only cancelled some order items and the cancelation is completd then changing the shipment status to packed
        // This is done because when cancelling some of the order items the shipment is marked as approved, resulting in removing the order from packed tab
        // but we need the order to be displayed in packed tab as it still has some items as reserved status
        if(isCancelled) {
          await this.store.dispatch("order/packDeliveryItems", this.currentOrder.shipmentId)
        }
      }

      await this.store.dispatch("order/updateCurrent", { order: this.currentOrder });
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
      getProductIdentificationValue,
      productIdentificationPref,
      saveOutline,
      store,
      translate
    };
  }
});
</script>