<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="orderType === 'packed' && order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP'" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="sendReadyForPickupEmail(order)">
            <ion-icon slot="icon-only" :icon="mailOutline" />
          </ion-button>
          <ion-button :disabled="!order?.orderId" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="orderType === 'open' && getBopisProductStoreSettings('PRINT_PICKLISTS')" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || !order.shipGroup?.items?.length"  @click="printPicklist(order, order.shipGroup)">
            <ion-icon slot="icon-only" :icon="printOutline" />
          </ion-button>
          <ion-button v-else-if="orderType === 'packed' && getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" :class="order.shipGroup.shipmentMethodTypeId !== 'STOREPICKUP' ? 'ion-hide-md-up' : ''" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || !order.shipGroup?.items?.length" @click="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? printPackingSlip(order) : printShippingLabelAndPackingSlip(order)">
            <ion-icon slot="icon-only" :icon="printOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Empty state -->
      <div class="empty-state" v-if="!order?.orderId">
        <p>{{ translate("Order not found")}}</p>
      </div>
      <main v-else>
        <aside class="ion-hide-md-down">
          <!-- Timeline -->
          <ion-item lines="none">
            <h2>{{ translate("Timeline") }}</h2>
            <ion-badge slot="end" :color="getColorByDesc(orderStatus)">{{ translate(orderStatus) }}</ion-badge>
          </ion-item>

          <ion-list class="ion-margin-start desktop-only">
            <ion-item v-for="event in orderTimeline" :key="event.id">
              <ion-icon :icon="event.icon" slot="start" />
              <ion-label>
                <p v-if="event.timeDiff">{{ event.timeDiff }}</p>
                {{ translate(event.label) }}
                <p v-if="event.metaData">{{ event.metaData }}</p>
              </ion-label>
              <ion-note slot="end" v-if="event.value && event.valueType === 'date-time-millis'">{{ formatDateTime(event.value) }}</ion-note>
            </ion-item>
          </ion-list>
        </aside>
        <section>
          <ion-item lines="none">
            <ion-icon slot="start" :icon="ticketOutline" />
            <ion-label>
              <h1>{{ order.orderName }}</h1>
              <p>{{ order.orderId }}</p>
            </ion-label>
            <ion-chip :disabled="!hasPermission(Actions.APP_ORDER_UPDATE)" v-if="order.pickers && (orderType === 'open' || orderType === 'packed') && getBopisProductStoreSettings('ENABLE_TRACKING')" outline slot="end" @click="editPicker(order)">
              <ion-icon :icon="personOutline"/>
              <ion-label>{{ order.pickers }}</ion-label>
            </ion-chip>
          </ion-item>

           <!-- Order Status -->
          <ion-item v-if="order.readyToHandover || order.readyToShip" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.readyToHandover ? translate("Order is now ready to handover.") : translate("Order is now ready to be shipped.") }}</ion-label>
          </ion-item>
          <ion-item v-if="order.handovered || order.shipped" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label class="ion-text-wrap">{{ order.handovered ? translate("Order is successfully handed over to customer.") : translate("Order is successfully shipped.") }}</ion-label>
          </ion-item>

          <ion-card>
            <div v-for="(item, index) in order.shipGroup?.items" :key="index" class="order-item">
              <ion-item class="product-info" lines="none">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                </ion-label>

                <div class="product-metadata" slot="end">
                  <!-- Order item rejection flow -->
                  <template v-if="orderType === 'open' && !(order.readyToHandover || order.readyToShip)">
                    <ion-chip v-if="item.rejectReason" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason($event, item, order)"/>
                      <ion-label>{{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-chip v-else-if="isEntierOrderRejectionEnabled(order)" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-label>{{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate("Reject to avoid order split (no variance)") }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-button v-else slot="end" color="danger" fill="clear" size="small" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-icon slot="icon-only" :icon="trashOutline"/>
                    </ion-button>
                  </template>
                  <!-- Order item calcelation flow -->
                  <template v-else-if="orderType === 'packed' && !(order.handovered || order.shipped)">
                    <ion-chip v-if="item.cancelReason" outline color="danger" @click.stop="openCancelReasonPopover($event, item, order)">
                      <ion-icon :icon="closeCircleOutline" @click.stop="removeCancellationReason($event, item, order)"/>
                      <ion-label>{{ getCancelReasonDescription(item.cancelReason) }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-button v-else slot="end" color="danger" fill="clear" size="small" @click.stop="openCancelReasonPopover($event, item, order)">
                      {{ translate("Cancel") }}
                    </ion-button>
                  </template>

                  <!-- Fetch Stock -->
                  <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                  <div v-else-if="getInventoryInformation(item.productId).quantityOnHand >= 0" class="atp-info">
                    <ion-note slot="end"> {{ translate("on hand", { count: getInventoryInformation(item.productId).quantityOnHand ?? '0' }) }} </ion-note>
                    <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                      <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                    </ion-button>
                  </div>
                  <ion-button v-else fill="clear" @click.stop="fetchProductInventory(item.productId, order.shipGroupSeqId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>

                  <ion-button :disabled="order.handovered || order.shipped || order.cancelled || hasCancelledItems" v-if="(orderType === 'packed' || orderType === 'completed') && getProduct(item.productId).productTypeId === 'GIFT_CARD'" color="medium" fill="clear" size="small" @click.stop="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
                  </ion-button>

                  <!-- Show kit components -->
                  <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item, order)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                  </ion-button>
                </div>
              </ion-item>
              <div v-if="isKit(item) && item.showKitComponents" class="kit-components ion-margin">
                <template v-if="!getProduct(item.productId)?.productComponents">
                  <ion-item lines="none">
                    <ion-skeleton-text animated style="height: 80%;"/>
                  </ion-item>
                  <ion-item lines="none">
                    <ion-skeleton-text animated style="height: 80%;"/>
                  </ion-item>
                </template>
                <template v-else-if="getProduct(item.productId)?.productComponents">
                  <ion-item lines="none" v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                    <ion-thumbnail slot="start">
                      <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                    </ion-thumbnail>
                    <ion-label>
                      <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                    </ion-label>
                    <ion-checkbox slot="end" aria-label="Rejection Reason kit component" v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.rejectedComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" color="danger"/>
                  </ion-item>
                </template>
              </div>
            </div>
          </ion-card>
          <p v-if="!order.shipGroup?.items?.length && orderType === 'open'" class="empty-state">{{ translate("All order items are rejected") }}</p>
          <p v-if="!order.shipGroup?.items?.length && orderType === 'packed'" class="empty-state">{{ translate("All order items are cancelled") }}</p>

          <template v-if="orderType === 'packed'">
            <ion-item lines="none" v-if="isCancelationSyncJobEnabled && isProcessRefundEnabled">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
              <ion-label>
                {{ translate("Cancelation and refund sync to Shopify is enabled.") }}
              </ion-label>
            </ion-item>
            <ion-item lines="none" v-else-if="isCancelationSyncJobEnabled">
              <ion-icon slot="start" :icon="warningOutline"/>
              <ion-label>
                {{ translate("Cancelation sync to Shopify is enabled. Refund processing is disabled.") }}
              </ion-label>
            </ion-item>
            <ion-item lines="none" v-else>
              <ion-icon slot="start" :icon="closeOutline"/>
              <ion-label>
                {{ translate("Cancelation and refund sync to Shopify is not enabled.") }}
              </ion-label>
            </ion-item>
          </template>

          <ion-item lines="none" v-if="orderType === 'open' && order.shipGroup?.items?.length">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected || hasRejectedItems" @click="readyForPickup(order, order.shipGroup)">
              <ion-icon slot="start" :icon="bagCheckOutline"/>
              {{ order?.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected || !hasRejectedItems" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Items") }}
            </ion-button>
          </ion-item>
          <ion-item lines="none" v-else-if="orderType === 'packed' && order.shipGroup?.items?.length" class="ion-hide-md-down">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled || hasCancelledItems" expand="block" @click="deliverShipment(order)">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
              {{ order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
            <ion-button color="danger" size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled || !hasCancelledItems" expand="block" fill="outline" @click="cancelOrder(order)">
              {{ translate("Cancel items") }}
            </ion-button>
          </ion-item>

          <div class="info">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ order?.customer?.name || order?.customer?.partyId }}</ion-card-title>
              </ion-card-header>
              <ion-list>
                <ion-item>
                  <ion-icon :icon="mailOutline" slot="start" />
                  <ion-label class="ion-text-wrap">{{ order.billingEmail || "-" }}</ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon :icon="callOutline" slot="start" />
                  <ion-label>{{ order.billingPhone || "-" }}</ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-icon :icon="cashOutline" slot="start" />
                  <ion-label v-if="order.billingAddress" class="ion-text-wrap">
                    {{ order.billingAddress.toName }}
                    <p>{{ order.billingAddress.address1 }}</p>
                    <p>{{ order.billingAddress.address2 }}</p>
                    <p>{{ order.billingAddress.city }} {{ order.billingAddress.city && order.billingAddress.postalCode && ',' }} {{ order.billingAddress.postalCode }}</p>
                    <p>{{ order.billingAddress.stateName }} {{ order.billingAddress.stateName && order.billingAddress.countryName && ',' }} {{ order.billingAddress.countryName }}</p>
                  </ion-label>
                  <ion-label v-else>{{ "-" }}</ion-label>
                </ion-item>
              </ion-list>
            </ion-card>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Payment") }}</ion-card-title>
              </ion-card-header>
              <div v-if="order.paymentPreferences?.length">
                <ion-list v-for="(orderPaymentPreference, index) in order.paymentPreferences" :key="index">
                  <ion-item lines="none">
                    <ion-label class="ion-text-wrap">
                      <p class="overline">{{ orderPaymentPreference.paymentMethodTypeId }}</p>
                      <ion-label>{{ translate(orderPaymentPreference.paymentMethodTypeDesc) || orderPaymentPreference.paymentMethodTypeId }}</ion-label>
                      <ion-note :color="getColorByDesc(orderPaymentPreference.statusDesc)">{{ translate(orderPaymentPreference.statusDesc) }}</ion-note>
                    </ion-label>
                    <div slot="end" class="ion-text-end">
                      <ion-badge v-if="order.paymentPreferences.length > 1 && index === 0" color="dark">{{ translate("Latest") }}</ion-badge>
                      <ion-label slot="end">{{ formatCurrency(orderPaymentPreference.maxAmount, order.currencyUom) }}</ion-label>
                    </div>
                  </ion-item>
                </ion-list>
              </div>
              <p v-else class="empty-state">
                {{ translate("No payments found") }}
              </p>
            </ion-card>
          </div>
        </section>

        <!-- Other shipments info -->
        <div class="other-shipments">
          <ion-item lines="none" v-if="order.shipGroups?.filter((group: any) => group.shipGroupSeqId !== order.shipGroup.shipGroupSeqId)?.length">
            <ion-label>{{ translate("Other shipments in this order") }}</ion-label>
          </ion-item>
          <div class="ion-padding">
            <template v-for="shipGroup in order.shipGroups" :key="shipGroup.shipmentId">
              <ion-card v-if="shipGroup.shipGroupSeqId !== order.shipGroup.shipGroupSeqId">
                <ion-card-header>
                  <div>
                    <ion-card-subtitle class="overline">{{ getfacilityTypeDesc(shipGroup.facilityTypeId) }}</ion-card-subtitle>
                    <ion-card-title>{{ shipGroup.facilityName }}</ion-card-title>
                    {{ shipGroup.shipGroupSeqId }}
                  </div>
                  <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">{{ shipGroup.category ? shipGroup.category : translate('Pending allocation') }}</ion-badge>
                </ion-card-header>

                <ion-item v-if="shipGroup.carrierPartyId">
                  {{ getPartyName(shipGroup.carrierPartyId) }}
                  <ion-label slot="end">{{ shipGroup.trackingCode }}</ion-label>
                  <ion-icon slot="end" :icon="locateOutline" />
                </ion-item>

                <ion-item v-if="shipGroup.shippingInstructions" color="light" lines="none">
                  <ion-label class="ion-text-wrap">
                    <p class="overline">{{ translate("Handling Instructions") }}</p>
                    <p>{{ shipGroup.shippingInstructions }}</p>
                  </ion-label>
                </ion-item>

                <ion-item lines="none" v-for="item in shipGroup?.items" :key="item">
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                  </ion-thumbnail>
                  <ion-label class="ion-text-wrap">
                    <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                    <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <ion-badge class="kit-badge" color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
                  </ion-label>

                  <div slot="end">
                    <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                    <div v-else-if="getInventoryInformation(item.productId).quantityOnHand >= 0" class="atp-info">
                      <ion-note slot="end"> {{ translate("on hand", { count: getInventoryInformation(item.productId).quantityOnHand ?? '0' }) }} </ion-note>
                      <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                        <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                      </ion-button>
                    </div>
                    <ion-button v-else fill="clear" @click.stop="fetchProductInventory(item.productId, shipGroup.shipGroupSeqId)">
                      <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                    </ion-button>
                  </div>
                </ion-item>
              </ion-card>
            </template>
          </div>
        </div>
      </main>

      <ion-fab v-if="orderType === 'open' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" @click="readyForPickup(order, order.shipGroup)">
          <ion-icon :icon="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? bagHandleOutline : giftOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-fab v-else-if="orderType === 'packed' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled" @click="deliverShipment(order)">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">

import {
  alertController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonPage,
  IonLabel,
  IonNote,
  IonSkeletonText,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
  popoverController
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  callOutline,
  cashOutline,
  copyOutline,
  closeOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  cubeOutline,
  gift,
  giftOutline,
  informationCircleOutline,
  locateOutline,
  mailOutline,
  personOutline,
  printOutline,
  pulseOutline,
  sendOutline,
  bagHandleOutline,
  bagRemoveOutline,
  timeOutline,
  ticketOutline,
  bagCheckOutline,
  sunnyOutline,
  downloadOutline,
  trashOutline,
  chevronUpOutline,
  listOutline,
  caretDownOutline,
  warningOutline,
  personAddOutline,
  medkitOutline
} from "ionicons/icons";
import { useRouter } from 'vue-router'
import { Actions, hasPermission } from '@/authorization'
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import EditPickerModal from "@/components/EditPickerModal.vue";
import { copyToClipboard, formatCurrency, getColorByDesc, getFeature, showToast } from '@/utils'
import { DateTime } from "luxon";
import { api, hasError } from '@/adapter';
import { OrderService } from "@/services/OrderService";
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import emitter from '@/event-bus'
import logger from "@/logger";
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'
import { isKit, getOrderStatus } from '@/utils/order'
import ReportAnIssuePopover from "@/components/ReportAnIssuePopover.vue";
import { UserService } from "@/services/UserService";
import ConfirmCancelModal from "@/components/ConfirmCancelModal.vue";
import { UtilService } from "@/services/UtilService";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";

export default defineComponent({
  name: "OrderDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonPage,
    IonLabel,
    IonNote,
    IonSkeletonText,
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    IonFab,
    IonFabButton,
  },
  data() {
    return {
      rejectEntireOrderReasonId: "REJ_AVOID_ORD_SPLIT",
      isCancelationSyncJobEnabled: false,
      isProcessRefundEnabled: false,
      cancelJobNextRunTime: "",
      orderTimeline: [] as any,
      hasCancelledItems: false,
      hasRejectedItems: false,
      pickers: [] as any,
      picklistDate: 0,
      orderStatus: ""
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      getProduct: 'product/getProduct',
      getInventoryInformation: 'stock/getInventoryInformation',
      getProductStock: 'stock/getProductStock',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPartyName: 'util/getPartyName',
      getBopisProductStoreSettings: 'user/getBopisProductStoreSettings',
      rejectReasons: 'util/getRejectReasons',
      cancelReasons: 'util/getCancelReasons',
      currentEComStore: 'user/getCurrentEComStore',
      getFacilityName: "util/getFacilityName",
      getEnumDescription: "util/getEnumDescription"
    })
  },
  props: ['orderType', 'orderId', 'shipGroupSeqId'],
  methods: {
    async fetchProductInventory(productId: string, shipGroupSeqId: any) {
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
      await this.store.dispatch('stock/fetchProductInventory', { productId })
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
    },
    async assignPicker(order: any, shipGroup: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, shipGroup, facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data.selectedPicker) {
          const selectedPicker = result.data.picker
          this.pickers = selectedPicker
          this.picklistDate = DateTime.now().toMillis()
          this.order.pickers = selectedPicker.name
          this.order.pickerIds = [selectedPicker.id]
          await this.store.dispatch('order/packShipGroupItems', { order, shipGroup, facilityId, selectedPicker: result.data.selectedPicker })
          this.prepareOrderTimeline();
        }
      })

      return assignPickerModal.present();
    },
    async editPicker(order: any) {
      const editPickerModal = await modalController.create({
        component: EditPickerModal,
        componentProps: { order }
      });

      editPickerModal.onDidDismiss().then((result) => {
        if(result.data?.selectedPicker){
          const selectedPicker = result.data.selectedPicker
          this.order.pickers = selectedPicker.name
          this.order.pickerIds = [selectedPicker.id]
          this.store.dispatch('order/updateCurrent', { order: this.order })
          this.prepareOrderTimeline();
        }
      })
      return editPickerModal.present();
    },
    async deliverShipment(order: any) {
      const pickup = order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
      const header = pickup ? translate("Handover") : translate("Ship");
      const message = pickup ? translate("Verify that the items in the package are valid and the customer has received their order. Once the order is handed over to the customer it cannot be undone.", { space: '<br/><br/>' }) : '';

      const alert = await alertController
        .create({
          header,
          message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          }, {
            text: translate(header),
            handler: async () => {
              await this.store.dispatch('order/deliverShipmentDetailView', order).then((resp: any) => {
                if(!hasError(resp)) {
                  // Update order timeline once the order is completed
                  // Sending statusId explicitly as we do not fetch the order info again on handover
                  this.prepareOrderTimeline({ statusId: "ORDER_COMPLETED" });
                }
              })
            }
          }]
        });
      return alert.present();
    },
    async openOrderItemRejHistoryModal() {
      const orderItemRejHistoryModal = await modalController.create({
        component: OrderItemRejHistoryModal,
      });
      return orderItemRejHistoryModal.present();
    },
    async getOrderDetail(orderId: any, shipGroupSeqId: any, orderType: any) {
      const payload = {
        facilityId: this.currentFacility?.facilityId,
        orderId,
        shipGroupSeqId
      }
      await this.store.dispatch("order/getOrderDetail", { payload, orderType })
    },
    async rejectOrder() {
      emitter.emit("presentLoader");

      const payload = {
        "orderId": this.order.orderId
      }

      let order = JSON.parse(JSON.stringify(this.order))

      // https://blog.devgenius.io/using-async-await-in-a-foreach-loop-you-cant-c174b31999bd
      // The forEach, map, reduce loops are not built to work with asynchronous callback functions.
      // It doesn't wait for the promise of an iteration to be resolved before it goes on to the next iteration.
      // We could use either the for…of the loop or the for(let i = 0;….)
      for (const item of order.shipGroup.items) {
        let params = {} as any;
        if(this.isEntierOrderRejectionEnabled(order)) {
          params = {
            ...payload,
            rejectReason: item.rejectReason || this.rejectEntireOrderReasonId,
            facilityId: item.facilityId,
            orderItemSeqId: item.orderItemSeqId,
            shipmentMethodTypeId: order.shipGroups.shipmentMethodTypeId,
            quantity: parseInt(item.quantity),
            ...(order.shipGroup.shipmentMethodTypeId === "STOREPICKUP" && ({"naFacilityId": "PICKUP_REJECTED"})),
          }
        } else if(item.rejectReason) {
          params = {
            ...payload,
            rejectReason: item.rejectReason || this.rejectEntireOrderReasonId,
            facilityId: item.facilityId,
            orderItemSeqId: item.orderItemSeqId,
            shipmentMethodTypeId: order.shipGroup.shipmentMethodTypeId,
            quantity: parseInt(item.quantity),
            ...(order.shipGroup.shipmentMethodTypeId === "STOREPICKUP" && ({"naFacilityId": "PICKUP_REJECTED"})),
          }
        }

        if(Object.keys(params).length) {
          // If the item is a kit, then pass the rejectedComponents with the item on rejection
          if(isKit(item)) {
            params["rejectedComponents"] = item.rejectedComponents
          }
          try {
            const resp = await OrderService.rejectOrderItem({ payload: params });
  
            if(!hasError(resp)) {
              order["shipGroup"] = {
                ...order.shipGroup,
                items: order.shipGroup.items.filter((orderItem: any) => !(orderItem.orderItemSeqId === item.orderItemSeqId && orderItem.productId === item.productId))
              }
            }
          } catch(err) {
            logger.error(`Something went wrong while rejecting order item ${item.productId}/${item.orderItemSeqId}`)
          }
        }
      }

      // If all the items are rejected then marking the whole order as rejected
      if(!order.shipGroup.items.length) order.rejected = true;

      await this.store.dispatch("order/updateCurrent", { order });
      this.hasRejectedItems = this.order.shipGroup.items.some((item: any) => item.rejectReason);

      // We are only preparing the complete timeline for the store pickup order
      if(this.order.shipGroup.shipmentMethodTypeId === "STOREPICKUP") {
        this.prepareOrderTimeline();
      }

      emitter.emit("dismissLoader");
    },
    async cancelOrder(order: any) {
      const cancelOrderConfirmModal = await modalController.create({
        component: ConfirmCancelModal,
        componentProps: {
          order,
          isCancelationSyncJobEnabled: this.isCancelationSyncJobEnabled,
          isProcessRefundEnabled: this.isProcessRefundEnabled,
          cancelJobNextRunTime: this.cancelJobNextRunTime,
          orderType: this.orderType
        }
      });

      cancelOrderConfirmModal.onDidDismiss().then(() => {
        this.hasCancelledItems = this.order.shipGroup.items.some((item: any) => item.cancelReason);
        // We are only preparing the complete timeline for the store pickup order
        if(this.order.shipGroup.shipmentMethodTypeId === "STOREPICKUP") {
          this.prepareOrderTimeline();
        }
      })

      return cancelOrderConfirmModal.present();
    },
    async readyForPickup(order: any, shipGroup: any) {
      if(this.getBopisProductStoreSettings('ENABLE_TRACKING') && !shipGroup.picklistId) return this.assignPicker(order, shipGroup, this.currentFacility?.facilityId);
      const pickup = shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
      const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
      const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customerName, space: '<br/><br/>' }) : '';

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          }, {
            text: header,
            handler: async () => {
              if(!pickup) {
                await this.packShippingOrders(order, shipGroup);
              } else {
                await this.store.dispatch('order/packShipGroupItems', {order, shipGroup, facilityId: this.currentFacility?.facilityId})
              }
              // Update order timeline once the order is marked as ready for pickup
              this.prepareOrderTimeline();
            }
          }]
        });
      return alert.present();
    },
    async packShippingOrders(currentOrder: any, shipGroup: any) {
      try {
        const resp = await OrderService.packOrder({
          'picklistBinId': currentOrder.picklistBinId,
          'orderId': currentOrder.orderId
        })

        if(!hasError(resp)) {
          showToast(translate("Order packed and ready for delivery"));
          this.store.dispatch("order/updateCurrent", { order: { ...currentOrder, readyToShip: true } }) 
          this.store.dispatch("order/removeOpenOrder", { order: currentOrder, shipGroup })
        } else {
          throw resp.data;
        }
      } catch(error: any) {
        logger.error(error);
        showToast(translate("Something went wrong"))
      }
    },
    async fetchRejectReasons() {
      await this.store.dispatch('util/fetchRejectReasons');
    },
    async fetchCancelReasons() {
      await this.store.dispatch('util/fetchCancelReasons');
    },
    async printPackingSlip(order: any) {
      try {
        // Get packing slip from the server
        const response: any = await api({
          method: 'get',
          url: 'PackingSlip.pdf',
          params: {
            shipmentId: order.shipmentId
          },
          responseType: "blob"
        })

        if (!response || response.status !== 200 || hasError(response)) {
          showToast(translate("Failed to load packing slip"))
          return;
        }

        // Generate local file URL for the blob received
        const pdfUrl = window.URL.createObjectURL(response.data);
        // Open the file in new tab
        try {
          (window as any).open(pdfUrl, "_blank").focus();
        }
        catch {
          showToast(translate('Unable to open as browser is blocking pop-ups.', {documentName: 'packing slip'}));
        }

      } catch(err) {
        showToast(translate("Failed to load packing slip"))
        logger.error(err)
      }
    },
    async printShippingLabelAndPackingSlip(order: any) {
      await OrderService.printShippingLabelAndPackingSlip(order.shipmentId)
    },
    async openInventoryDetailPopover(Event: any, item: any){
      const popover = await popoverController.create({
        component: InventoryDetailsPopover,
        event: Event,
        showBackdrop: false,
        componentProps: { item }
      });
      await popover.present();
    },
    formatDateTime(date: any) {
      return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
    },
    findTimeDiff(startTime: any, endTime: any) {
      if(!endTime || !startTime) {
        return ""
      }

      const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]);
      let diffString = "+ ";
      if(timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `
      if(timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `
      if(timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `
      if(timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `
      if(timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes`
      return diffString
    },
    async fetchKitComponents(orderItem: any, order: any, toggleKitComponents = true) {
      await this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })

      if(toggleKitComponents) {
        orderItem.showKitComponents = !orderItem.showKitComponents
        this.store.dispatch("order/updateCurrentOrderInfo", order)
      }
    },
    async openRejectReasonPopover(ev: Event, item: any, order: any) {
      const reportIssuePopover = await popoverController.create({
        component: ReportAnIssuePopover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      reportIssuePopover.present();

      const result = await reportIssuePopover.onDidDismiss();

      if (result.data) {
        this.updateRejectReason(result.data, item, order)
      }
    },
    async openCancelReasonPopover(ev: Event, item: any, order: any) {
      const cancelItemPopover = await popoverController.create({
        component: ReportAnIssuePopover,
        componentProps: {
          reasonType: "cancel"
        },
        event: ev,
        translucent: true,
        showBackdrop: false,
      });

      cancelItemPopover.present();

      const result = await cancelItemPopover.onDidDismiss();

      if (result.data) {
        this.updateCancelReason(result.data, item, order)
      }
    },
    async updateCancelReason(updatedReason: string, item: any, order: any) {
      item.cancelReason = updatedReason;
      this.hasCancelledItems = true
      this.store.dispatch("order/updateCurrent", { order })
    },
    async updateRejectReason(updatedReason: string, item: any, order: any) {
      item.rejectReason = updatedReason;

      // If the current item is kit, and if its components are not available then fetch the components for the kit and mark those components as rejected components
      if(isKit(item)) {
        if(!this.getProduct(item.productId).productComponents) await this.fetchKitComponents(item, order, false)
        item.rejectedComponents = this.getProduct(item.productId).productComponents?.map((product: any) => product.productIdTo)
      }

      this.hasRejectedItems = true
      this.store.dispatch("order/updateCurrent", { order })
    },
    getRejectionReasonDescription(rejectionReasonId: string) {
      const reason = this.rejectReasons?.find((reason: any) => reason.enumId === rejectionReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    getCancelReasonDescription(cancelReasonId: string) {
      const reason = this.cancelReasons?.find((reason: any) => reason.enumId === cancelReasonId)
      return reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    isEntierOrderRejectionEnabled(order: any) {
      return (!this.partialOrderRejectionConfig || !this.partialOrderRejectionConfig.settingValue || !JSON.parse(this.partialOrderRejectionConfig.settingValue)) && this.hasRejectedItems
    },
    async removeRejectionReason(ev: Event, item: any, order: any) {
      delete item["rejectedComponents"];
      item.rejectReason = "";
      this.hasRejectedItems = order.shipGroup.items.some((item: any) => item.rejectReason);
      this.store.dispatch("order/updateCurrent", { order })
    },
    async removeCancellationReason(ev: Event, item: any, order: any) {
      item.cancelReason = "";
      this.hasCancelledItems = order.shipGroup.items.some((item: any) => item.cancelReason);
      this.store.dispatch("order/updateCurrent", { order })
    },
    rejectKitComponent(order: any, item: any, componentProductId: string) {
      let rejectedComponents = item.rejectedComponents ? item.rejectedComponents : []
      if (rejectedComponents.includes(componentProductId)) {
        rejectedComponents = rejectedComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId)
      } else {
        rejectedComponents.push(componentProductId);
      }
      item.rejectedComponents = rejectedComponents;
      order.shipGroup.items.map((orderItem: any) => {
        if (orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.rejectedComponents = rejectedComponents;
        }
      })
      this.store.dispatch("order/updateCurrent", { order })
    },
    async printPicklist(order: any, shipGroup: any) {
      if(shipGroup.picklistId) {
        await OrderService.printPicklist(order.picklistId)
        return;
      }

      if(!this.getBopisProductStoreSettings('ENABLE_TRACKING')) {
        try {
          const resp = await UserService.ensurePartyRole({
            partyId: "_NA_",
            roleTypeId: "WAREHOUSE_PICKER",
          })

          if(hasError(resp)) {
            throw resp.data;
          }
        } catch (error) {
          showToast(translate("Something went wrong. Picklist can not be created."));
          logger.error(error)
          return;
        }
        await this.createPicklist(order, "_NA_", "Default");
        this.pickers = ["Default"]
        this.picklistDate = DateTime.now().toMillis()
        this.prepareOrderTimeline();
        return;
      }

      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, shipGroup, facilityId: this.currentFacility.facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data?.selectedPicker) {
          await this.createPicklist(order, result.data.selectedPicker, result.data.picker)
          this.pickers = result.data.picker
          this.picklistDate = DateTime.now().toMillis()
          this.prepareOrderTimeline();
        }
      })

      return assignPickerModal.present();
    },
    async createPicklist(order: any, selectedPicker: any, picker: any) {
      let resp;

      const items = order.shipGroup.items;
      const formData = new FormData();
      formData.append("facilityId", items[0].facilityId);
      items.map((item: any, index: number) => {
        formData.append("itemStatusId_o_"+index, "PICKITEM_PENDING")
        formData.append("pickerIds_o_"+index, selectedPicker)
        formData.append("picked_o_"+index, item.quantity)
        Object.keys(item).map((property) => {
          if(property !== "facilityId") formData.append(property+'_o_'+index, item[property])
        })
      });

      try {
        resp = await OrderService.createPicklist(formData);
        if(!hasError(resp)) {
          // generating picklist after creating a new picklist
          await OrderService.printPicklist(resp.data.picklistId)
          order["isPicked"] = "Y"
          order["pickers"] = picker.name
          order["picklistId"] = resp.data.picklistId
          order["picklistBinId"] = resp.data.picklistBinId
          this.store.dispatch('order/updateCurrent', { order })
        } else {
          throw resp.data;
        }
      } catch (err) {
        showToast(translate('Something went wrong. Picklist can not be created.'));
        emitter.emit("dismissLoader");
        return;
      }
    },
    async fetchJobs() {
      // TODO: Add check to only fetch the jobs for current product store
      let params = {
        inputFields: {
          statusId: ["SERVICE_DRAFT", "SERVICE_PENDING"],
          statusId_op: "in",
          systemJobEnumId: "JOB_UL_CNCLD_ORD",
          systemJobEnumId_op: "equals",
          productStoreId: this.currentEComStore?.productStoreId,
        },
        orderBy: "runTime DESC",
        noConditionFind: "Y",
        viewSize: 50
      } as any

      try {
        const resp = await UtilService.fetchJobInformation(params)

        if(!hasError(resp) && resp.data.count) {
          resp.data.docs.find((job: any) => {
            if(job.statusId === "SERVICE_PENDING") {
              this.isCancelationSyncJobEnabled = true;
              this.cancelJobNextRunTime = job.runTime
              this.getProcessRefundStatus();
              return true;
            }
          })
        }
      } catch(err) {
        logger.error(err)
      }
    },
    async getProcessRefundStatus() {
      try {
        const params = {
          inputFields: {
            productStoreId: this.currentEComStore?.productStoreId,
            productStoreId_op: "equals"
          },
          entityName: "ShopifyConfig",
          fieldList: ["shopifyConfigId", "processRefund"],
          viewSize: 1
        }

        const resp = await UtilService.getProcessRefundStatus(params);
        if(!hasError(resp) && resp.data?.count > 0) {
          this.isProcessRefundEnabled = resp.data.docs[0]?.processRefund === "Y"
        }
      } catch(err) {
        logger.error(err)
      }
    },
    async fetchOrderChangeHistory() {
      // Only fetching the records those are store pickup related
      // Added fromFacility check as when customer manually moves order it will be moved from PICKUP_REJECTED queue
      // Added facilityId check as when order is rejected/canceled it will be moved to PICKUP_REJECTED queue
      // TODO: need to implement the support to fetch the history for ship orders
      let orderChangeHistory = []
      try {
        let payload = {
          inputFields: {
            orderId: this.order.orderId,
            fromFacilityId_value: "PICKUP_REJECTED",
            fromFacilityId_op: "equals",
            fromFacilityId_grp :"1",
            facilityId_value: "PICKUP_REJECTED",
            facilityId_op: "equals",
            facilityId_grp: "2"
          },
          entityName: "OrderFacilityChange",
          orderBy: "changeDatetime DESC",
          viewSize: 250,
        }

        const resp = await OrderService.performFind(payload);
        if(!hasError(resp) && resp.data.docs?.length) {
          orderChangeHistory = resp.data.docs
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error("Failed to fetch order change history", err)
      }

      return orderChangeHistory
    },
    async fetchOrderCommunicationEvent() {
      let orderCommunicationEvent = []
      try {
        let payload = {
          inputFields: {
            orderId: this.order.orderId,
            subject: "pickup",
            subject_op: "contains",
            communicationEventTypeId: "EMAIL_COMMUNICATION"
          },
          entityName: "CommunicationEventAndOrder",
          viewSize: 250,
          orderBy: "entryDate ASC",
          fieldList: ["communicationEventId", "entryDate", "orderId"]
        }

        const resp = await OrderService.performFind(payload);
        if(!hasError(resp) && resp.data.docs?.length) {
          orderCommunicationEvent = resp.data.docs
        } else {
          throw resp.data;
        }
      } catch(err) {
        logger.error("Failed to fetch communication events for order", err)
      }

      return orderCommunicationEvent
    },
    sortSequence(sequence: any, sortOnField: string) {
      return sequence.sort((a: any, b: any) => {
        if(a[sortOnField] === b[sortOnField]) return 0;

        // Sort undefined values at last
        if(a[sortOnField] == undefined) return 1;
        if(b[sortOnField] == undefined) return -1;

        return a[sortOnField] - b[sortOnField]
      })
    },
    async prepareOrderTimeline(paramsToUpdate ?: any) {
      const timeline = []

      const {orderRouteSegment, shipmentStatusInfo} = await this.fetchOrderRouteSegmentInfo();

      // Get order status using utility method
      this.orderStatus = this.getOrderStatus({
        ...this.order,
        ...paramsToUpdate
      }, this.order.shipGroup, orderRouteSegment, this.orderType)

      let orderChangeHistory = await this.fetchOrderChangeHistory();
      const orderPickupEmailCommnicationEvent = await this.fetchOrderCommunicationEvent();

      // Removed the first record from the list, the first mail is sent as soon as item is marked for pickup
      // and we do not need to add the same in the timeline
      const communicationEvents = orderPickupEmailCommnicationEvent.slice(1).map((event: any) => ({
        ...event,
        sortDate: event.entryDate
      }))

      const facilityIds = [] as Array<string>
      const enumIds = [] as Array<string>
      orderChangeHistory = orderChangeHistory.map((orderChange: any) => {
        facilityIds.push(orderChange.facilityId)
        facilityIds.push(orderChange.fromFacilityId)
        enumIds.push(orderChange.changeReasonEnumId)
        return {
          ...orderChange,
          sortDate: orderChange.changeDatetime
        }
      })

      await this.store.dispatch("util/fetchFacilities", [...new Set(facilityIds)])
      await this.store.dispatch("util/fetchEnumerations", [...new Set(enumIds)])

      const orderTimelineComponents = [...communicationEvents, ...orderChangeHistory]

      // Add order creation date to timeline
      if(this.order.orderDate) {
        timeline.push({
          label: "Created in Shopify",
          id: "orderDate",
          value: this.order.orderDate,
          icon: sunnyOutline,
          valueType: "date-time-millis"
        })
      }

      // Add order import date to timeline
      if(this.order.entryDate) {
        timeline.push({
          label: "Imported from Shopify",
          id: "entryDate",
          value: this.order.entryDate,
          icon: downloadOutline,
          valueType: "date-time-millis",
          timeDiff: this.findTimeDiff(this.order.orderDate, this.order.entryDate)
        })
      }

      // Add order approved date to timeline
      if(this.order.approvedDate) {
        timeline.push({
          label: "Approved for fulfillment",
          id: "approvedDate",
          value: this.order.approvedDate,
          icon: pulseOutline,
          valueType: "date-time-millis",
          timeDiff: this.findTimeDiff(this.order.orderDate, this.order.approvedDate)
        })
      }

      // Add picker info to timeline
      if((this.order.pickers?.length && this.order.picklistDate) || this.pickers.length) {
        const date = this.order.picklistDate || this.picklistDate || DateTime.now().toMillis()
        timeline.push({
          label: "Picker assigned",
          id: "pickerInfo",
          value: date,
          icon: personAddOutline,
          valueType: "date-time-millis",
          timeDiff: this.findTimeDiff(this.order.orderDate, date),
          metaData: this.order.pickers || this.pickers
        })
      }

      if(orderTimelineComponents.length) {
        orderTimelineComponents.map((component: any) => {
          let label = "Pickup remainder"
          let id = "pickupRemainder"
          let icon = mailOutline
          let metaData = ""
          if(component.facilityId === "PICKUP_REJECTED") {
            label = "Rejected"
            id = "rejected"
            icon = trashOutline
            metaData = this.getFacilityName(component.fromFacilityId) + ": " + this.getEnumDescription(component.changeReasonEnumId)
          } else if(component.fromFacilityId === "PICKUP_REJECTED") {
            label = "Assigned for fulfillment"
            id = "assigned"
            icon = medkitOutline
            metaData = this.getFacilityName(component.facilityId) + ": " + this.getEnumDescription(component.changeReasonEnumId)
          }

          timeline.push({
            label,
            id,
            value: component.sortDate,
            icon,
            valueType: "date-time-millis",
            timeDiff: this.findTimeDiff(this.order.orderDate, component.sortDate),
            metaData
          })
        })
      }

      // Add order completed date to timeline, if we do not have order completed date then check for orderType
      if(this.order.completedDate || this.orderType === "completed") {
        timeline.push({
          label: this.order.shipGroup.shipmentMethodTypeId === "STOREPICKUP" ? "Picked up" : "Order completed",
          id: "completedDate",
          value: this.order.completedDate ? this.order.completedDate : undefined,
          icon: checkmarkDoneOutline,
          valueType: "date-time-millis",
          timeDiff: this.order.completedDate ? this.findTimeDiff(this.order.orderDate, this.order.completedDate) : ""
        })
      }

      const getShipmentPackedDate = shipmentStatusInfo?.find((statusInfo: any) => statusInfo.statusId === "SHIPMENT_PACKED")
      if(getShipmentPackedDate?.statusDate) {
        timeline.push({
          label: "Ready for pickup",
          id: "packedDate",
          value: getShipmentPackedDate.statusDate,
          icon: bagCheckOutline,
          valueType: "date-time-millis",
          timeDiff: this.findTimeDiff(this.order.orderDate, getShipmentPackedDate.statusDate)
        })
      }

      this.orderTimeline = this.sortSequence(timeline, "value")
    },
    async fetchOrderRouteSegmentInfo() {
      let orderRouteSegment = []
      let shipmentStatusInfo = []
      try {
        const resp = await OrderService.performFind({
          inputFields: {
            orderId: this.order.orderId,
            shipGroupSeqId: this.order.shipGroup.shipGroupSeqId
          },
          fieldList: ["orderId", "shipGroupSeqId", "shipmentId", "shipmentStatusId", "trackingIdNumber"],
          viewSize: 50,
          entityName: "OrderShipmentAndRouteSegment"
        }) as any

        if(!hasError(resp) && resp.data?.docs.length) {
          orderRouteSegment = resp.data.docs

          if(resp.data.docs[0].shipmentId) {
            const shipmentStatusResp = await OrderService.performFind({
              inputFields: {
                shipmentId: resp.data.docs[0].shipmentId
              },
              fieldList: ["shipmentId", "statusId", "statusDate"],
              viewSize: 50,
              entityName: "ShipmentAndShipmentStatus"
            }) as any

            if(!hasError(resp) && shipmentStatusResp.data?.docs.length) {
              shipmentStatusInfo = shipmentStatusResp.data.docs
            }
          }
        }
      } catch(err) {
        logger.error("Failed to fetch route segment info for order")
      }

      return {
        orderRouteSegment,
        shipmentStatusInfo
      }
    },
    async sendReadyForPickupEmail(order: any) {
      const header = translate("Resend email")
      const message = translate("An email notification will be sent to that their order is ready for pickup.", { customerName: order.customerName });

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate("Cancel"),
            role: "cancel"
          },{
            text: translate("Send"),
            handler: async () => {
              try {
                const resp = await OrderService.sendPickupScheduledNotification({ shipmentId: order.shipmentId });
                if (!hasError(resp)) {
                  showToast(translate("Email sent successfully"))
                } else {
                  showToast(translate("Something went wrong while sending the email."))
                }
              } catch (error) {
                showToast(translate("Something went wrong while sending the email."))
                logger.error(error)
              }
            }
          }]
        });
      return alert.present();
    },
    async openGiftCardActivationModal(item: any) {
      const modal = await modalController.create({
        component: GiftCardActivationModal,
        componentProps: { item, orderId: this.orderId, customerId: this.order.customerId, currencyUom: this.order.currencyUom }
      })
      
      modal.onDidDismiss().then((result: any) => {
        if(result.data?.isGCActivated) {
          this.store.dispatch("order/updateCurrentItemGCActivationDetails", { item, orderId: this.orderId, isDetailsPage: true })
        }
      })
      modal.present();
    }
  },
  async mounted() {
    emitter.emit("presentLoader")
    await this.getOrderDetail(this.orderId, this.shipGroupSeqId, this.orderType);

    // fetch rejection reasons only when we get the orders information
    if(this.order.orderId) {
      this.orderType === "open" ? await this.fetchRejectReasons() : await this.fetchCancelReasons();
    }

    if(this.orderType === "packed") {
      this.fetchJobs();
      this.hasCancelledItems = this.order.shipGroup?.items.some((item: any) => item.cancelReason);
    } else if(this.orderType === "open") {
      this.hasRejectedItems = this.order.shipGroup?.items.some((item: any) => item.rejectReason);
    }

    await this.prepareOrderTimeline();

    emitter.emit("dismissLoader")
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const userStore = useUserStore()
    const productIdentificationStore = useProductIdentificationStore();
    let productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
    let currentFacility: any = computed(() => userStore.getCurrentFacility) 

    return {
      Actions,
      bagCheckOutline,
      bagHandleOutline,
      bagRemoveOutline,
      callOutline,
      caretDownOutline,
      cashOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      closeOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      chevronUpOutline,
      cubeOutline,
      currentFacility,
      downloadOutline,
      formatCurrency,
      getColorByDesc,
      getOrderStatus,
      getProductIdentificationValue,
      gift,
      giftOutline,
      getFeature,
      hasPermission,
      informationCircleOutline,
      isKit,
      listOutline,
      locateOutline,
      personOutline,
      personAddOutline,
      printOutline,
      productIdentificationPref,
      pulseOutline,
      router,
      store,
      sunnyOutline,
      ticketOutline,
      timeOutline,
      warningOutline,
      mailOutline,
      sendOutline,
      translate,
      trashOutline
    };
  }
});
</script>

<style scoped>

.border-top, .order-item:not(:first-child) {
  border-top: 1px solid #ccc;
}

ion-card-header {
  flex-direction: unset;
  justify-content: space-between;
  align-items: center;
}

.info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
  align-items: start;
}

.product-info {
  padding: var(--spacer-sm);
  padding-left: 0;
}

.product-metadata {
  display: flex;
  align-items: center;
}

.kit-components {
  display: flex;
  gap: var(--spacer-xs);
}

.kit-components > ion-item {
  border: 1px solid var(--ion-color-medium);
  border-radius: 10px;
}

@media (min-width: 343px) {
  .other-shipments {
    grid-column: 1/-1;
  }

  .other-shipments > div {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(343px, 1fr));
  }
}

@media (min-width: 768px) {
  main {
    display: grid;
    grid-template-columns: 1fr .6fr;
    gap: var(--spacer-base);
    margin-top: var(--spacer-xl);
    align-items: start;
  }

  aside {
    border-left: 1px solid black;
    grid-column: 2;
    grid-row: 1;
  }
}
</style>