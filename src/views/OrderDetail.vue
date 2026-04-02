<template>
  <ion-page data-testid="order-details-page">
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button data-testid="resendmail-button" v-if="orderType === 'packed' && order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP'" :disabled="!order?.orderId || !useUserStore().hasPermission('') || order.handovered || order.shipped" @click="sendReadyForPickupEmail(order)">
            <ion-icon slot="icon-only" :icon="mailOutline" />
          </ion-button>
          <ion-button data-testid="rejection-history-button" :disabled="!order?.orderId" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button data-testid="print-picklist-button" v-if="orderType === 'open' && isPrintPicklistsEnabled" :disabled="!order?.orderId || !useUserStore().hasPermission('') || order.handovered || order.shipped || !order.shipGroup?.items?.length"  @click="printPicklist(order, order.shipGroup)">
            <ion-icon slot="icon-only" :icon="printOutline" />
          </ion-button>
          <ion-button data-testid="packing-slip-button" v-else-if="orderType === 'packed' && isPrintPackingSlipEnabled" :class="order.shipGroup.shipmentMethodTypeId !== 'STOREPICKUP' ? 'ion-hide-md-up' : ''" :disabled="!order?.orderId || !useUserStore().hasPermission('') || order.handovered || order.shipped || !order.shipGroup?.items?.length" @click="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? printPackingSlip(order) : printShippingLabelAndPackingSlip(order)">
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
            <ion-badge slot="end" :color="commonUtil.getColorByDesc(orderStatus)">{{ translate(orderStatus) }}</ion-badge>
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
              <h1 data-testid="order-name-tag">{{ order.orderName }}</h1>
              <p data-testid="order-id-tag">{{ order.orderId }}</p>
            </ion-label>
            <ion-chip data-testid="edit-picker-chip" :disabled="!useUserStore().hasPermission('') || order.handovered || order.shipped || order.rejected || order.cancelled" v-if="order.pickers && (orderType === 'open' || orderType === 'packed') && isTrackingEnabled" outline slot="end" @click="editPicker(order)">
              <ion-icon :icon="personOutline"/>
              <ion-label>{{ order.pickers }}</ion-label>
            </ion-chip>
          </ion-item>

           <!-- Order Status -->
          <ion-item v-if="orderType === 'open' && ( order.readyToHandover || order.readyToShip )" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label data-testid="ready-handover-label" class="ion-text-wrap">{{ order.readyToHandover ? translate("Order is now ready to handover.") : translate("Order is now ready to be shipped.") }}</ion-label>
          </ion-item>
          <ion-item v-if="orderType === 'packed' && ( order.handovered || order.shipped )" color="light" lines="none">
            <ion-icon :icon="checkmarkCircleOutline" color="success" slot="start" />
            <ion-label data-testid="handed-over-success-label" class="ion-text-wrap">{{ order.handovered ? translate("Order is successfully handed over to customer.") : translate("Order is successfully shipped.") }}</ion-label>
          </ion-item>

          <ion-card>
            <div v-for="(item, index) in order.shipGroup?.items" :key="index" class="order-item">
              <ion-item data-testid="detail-page-item" class="product-info" lines="none">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p class="ion-text-wrap">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                  <ion-badge color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                </ion-label>

                <div class="product-metadata" slot="end">
                  <!-- Order item rejection flow -->
                  <template v-if="orderType === 'open' && !(order.readyToHandover || order.readyToShip) && !isRequestTransferEnabled">
                    <ion-chip data-testid="change-rejection-reason-chip" v-if="item.rejectReason" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-icon data-testid="void-rejection-reason-icon" :icon="closeCircleOutline" @click.stop="removeRejectionReason(item, order)"/>
                      <ion-label>{{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-chip v-else-if="isEntireOrderRejectionEnabled()" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-label>{{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate("Reject to avoid order split (no variance)") }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-button data-testid="select-rejected-item-button" v-else slot="end" color="danger" fill="clear" size="default" @click.stop="openRejectReasonPopover($event, item, order)">
                      <ion-icon slot="icon-only" :icon="trashOutline"/>
                    </ion-button>
                  </template>
                  <!-- Order item calcelation flow -->
                  <template v-else-if="orderType === 'packed' && !(order.handovered || order.shipped)">
                    <ion-chip data-testid="change-cancel-reason-chip" v-if="item.cancelReason" outline color="danger" @click.stop="openCancelReasonPopover($event, item, order)">
                      <ion-icon data-testid="void-cancel-reason-icon" :icon="closeCircleOutline" @click.stop="removeCancellationReason(item, order)"/>
                      <ion-label>{{ getCancelReasonDescription(item.cancelReason) }}</ion-label>
                      <ion-icon :icon="caretDownOutline"/>
                    </ion-chip>
                    <ion-button data-testid="select-cancel-item-button" v-else slot="end" color="danger" fill="clear" size="small" :disabled="!useUserStore().hasPermission('ORD_SALES_ORDER_CNCL')" @click.stop="openCancelReasonPopover($event, item, order)">
                      {{ translate("Cancel") }}
                    </ion-button>
                  </template>

                  <!-- Fetch Stock -->
                  <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                  <div v-else-if="getInventoryInformation(item.productId).quantityOnHand >= 0" class="atp-info">
                    <ion-note slot="end"> {{ translate("on hand", { count: getInventoryInformation(item.productId).quantityOnHand ?? '0' }) }} </ion-note>
                    <ion-button size="default" fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                      <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                    </ion-button>
                  </div>
                  <ion-button size="default" data-testid="qoh-button" v-else fill="clear" @click.stop="fetchProductInventory(item.productId, order.shipGroupSeqId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>

                  <ion-button data-testid="gift-card-activation-button" :disabled="order.handovered || order.shipped || order.cancelled || hasCancelledItems" v-if="(orderType === 'packed' || orderType === 'completed') && getProduct(item.productId).productTypeId === 'GIFT_CARD'" color="medium" fill="clear" size="default" @click.stop="openGiftCardActivationModal(item)">
                    <ion-icon slot="icon-only" :icon="item.isGCActivated ? gift : giftOutline"/>
                  </ion-button>

                  <!-- Show kit components -->
                  <ion-button v-if="orderUtil.isKit(item)" fill="clear" size="default" @click.stop="fetchKitComponents(item, order)">
                    <ion-icon v-if="item.showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                    <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                  </ion-button>
                </div>
              </ion-item>
              <div v-if="orderUtil.isKit(item) && item.showKitComponents" class="kit-components ion-margin">
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
                      <p class="overline">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                      {{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                    </ion-label>
                    <ion-checkbox slot="end" aria-label="Rejection Reason kit component" v-if="item.rejectReason || isEntireOrderRejectionEnabled()" :checked="item.rejectedComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" color="danger"/>
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
                {{ translate("Cancellation and refund sync to Shopify is enabled.") }}
              </ion-label>
            </ion-item>
            <ion-item lines="none" v-else-if="isCancelationSyncJobEnabled">
              <ion-icon slot="start" :icon="warningOutline"/>
              <ion-label>
                {{ translate("Cancellation sync to Shopify is enabled. Refund processing is disabled.") }}
              </ion-label>
            </ion-item>
            <ion-item lines="none" v-else>
              <ion-icon slot="start" :icon="closeOutline"/>
              <ion-label>
                {{ translate("Cancellation and refund sync to Shopify is not enabled.") }}
              </ion-label>
            </ion-item>
          </template>

          <ion-item lines="none" v-if="orderType === 'open' && order.shipGroup?.items?.length">
            <ion-button data-testid="ready-pickup-button" size="default" :disabled="!useUserStore().hasPermission('') || order.readyToHandover || order.readyToShip || order.rejected || hasRejectedItems" @click="readyForPickup(order, order.shipGroup)">
              <ion-icon slot="start" :icon="bagCheckOutline"/>
              {{ order?.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button data-testid="submit-rejected-items-button" v-if="!isRequestTransferEnabled" size="default" :disabled="!useUserStore().hasPermission('') || order.readyToHandover || order.readyToShip || order.rejected || !hasRejectedItems" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Items") }}
            </ion-button>
            <ion-button fill="outline" data-testid="request-transfer-button" v-if="isRequestTransferEnabled" size="default" color="warning" :disabled="!useUserStore().hasPermission('') || !canRequestTransfer(order)" @click="confirmRequestTransfer(order)">
              <ion-icon slot="start" :icon="swapHorizontalOutline"/>
              {{ translate("Request Transfer") }}
            </ion-button>            
          </ion-item>
          <ion-item lines="none" v-else-if="orderType === 'packed' && order.shipGroup?.items?.length" class="ion-hide-md-down">
            <ion-button data-testid="handover-button" size="default" :disabled="!useUserStore().hasPermission('') || order.handovered || order.shipped || order.cancelled || hasCancelledItems" expand="block" @click="deliverShipment(order)">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
              {{ order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
            <ion-button data-testid="submit-cancel-items-button" color="danger" size="default" :disabled="!useUserStore().hasPermission('')||!useUserStore().hasPermission('ORD_SALES_ORDER_CNCL') || order.handovered || order.shipped || order.cancelled || !hasCancelledItems" expand="block" fill="outline" @click="cancelOrder(order)">
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
                  <ion-label>{{ commonUtil.formatPhoneNumber(order.billingPhone?.countryCode, order.billingPhone?.areaCode, order.billingPhone?.contactNumber) || '-' }}</ion-label>
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
                      <ion-note :color="commonUtil.getColorByDesc(orderPaymentPreference.statusDesc)">{{ translate(orderPaymentPreference.statusDesc) }} {{ translate("at") }} : {{ DateTime.fromMillis(orderPaymentPreference.createdDate).toFormat("d LLL yyyy, h:mm a") }}</ion-note>
                    </ion-label>
                    <div slot="end" class="ion-text-end">
                      <ion-label slot="end">{{ commonUtil.formatCurrency(orderPaymentPreference.maxAmount, order.currencyUom) }}</ion-label>
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
                    <ion-card-subtitle class="overline">{{ shipGroup.facilityTypeDescription }}</ion-card-subtitle>
                    <ion-card-title>{{ shipGroup.facilityName }}</ion-card-title>
                    {{ shipGroup.shipGroupSeqId }}
                  </div>
                  <ion-badge :color="shipGroup.category ? 'primary' : 'medium'">{{ shipGroup.category ? shipGroup.category : translate('Pending allocation') }}</ion-badge>
                </ion-card-header>

                <ion-item v-if="shipGroup.carrierPartyId">
                  {{ getCarrierName(shipGroup.carrierPartyId) }}
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
                    <h2>{{ commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? commonUtil.getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                    <p class="ion-text-wrap">{{ commonUtil.getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                    <ion-badge class="kit-badge" color="dark" v-if="orderUtil.isKit(item)">{{ translate("Kit") }}</ion-badge>
                  </ion-label>

                  <div slot="end">
                    <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                    <div v-else-if="getInventoryInformation(item.productId).quantityOnHand >= 0" class="atp-info">
                      <ion-note slot="end"> {{ translate("on hand", { count: getInventoryInformation(item.productId).quantityOnHand ?? '0' }) }} </ion-note>
                      <ion-button size="default" fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                        <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                      </ion-button>
                    </div>
                    <ion-button size="default" v-else fill="clear" @click.stop="fetchProductInventory(item.productId, shipGroup.shipGroupSeqId)">
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
        <ion-fab-button :disabled="!useUserStore().hasPermission('') || order.readyToHandover || order.readyToShip || order.rejected" @click="readyForPickup(order, order.shipGroup)">
          <ion-icon :icon="order.shipGroup.shipmentMethodTypeId === 'STOREPICKUP' ? bagHandleOutline : giftOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-fab v-else-if="orderType === 'packed' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button data-testid="handover-fab-button" :disabled="!useUserStore().hasPermission('') || order.handovered || order.shipped || order.cancelled" @click="deliverShipment(order)">
          <ion-icon :icon="checkmarkDoneOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import { alertController, IonBackButton, IonBadge, IonButton, IonButtons, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonList, IonPage, IonLabel, IonNote, IonSkeletonText, IonSpinner, IonThumbnail, IonTitle, IonToolbar, IonFab, IonFabButton, modalController, popoverController } from "@ionic/vue";
import { onMounted, ref, computed } from "vue";
import { banSharp, callOutline, cashOutline, closeOutline, closeCircleOutline, checkmarkCircleOutline, checkmarkDoneOutline, cubeOutline, gift, giftOutline, informationCircleOutline, locateOutline, mailOutline, personOutline, printOutline, pulseOutline, bagHandleOutline, timeOutline, ticketOutline, bagCheckOutline, swapHorizontalOutline, sunnyOutline, downloadOutline, trashOutline, chevronUpOutline, listOutline, caretDownOutline, warningOutline, personAddOutline, medkitOutline } from "ionicons/icons";
import router from "@/router";
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import EditPickerModal from "@/components/EditPickerModal.vue";

import { DateTime } from "luxon";
import { api, commonUtil, emitter, logger, translate } from '@common';
import { useProductStore } from "@/store/productStore";
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'
import { orderUtil } from '@/utils/orderUtil'
import ReportAnIssuePopover from "@/components/ReportAnIssuePopover.vue";
import ConfirmCancelModal from "@/components/ConfirmCancelModal.vue";
import GiftCardActivationModal from "@/components/GiftCardActivationModal.vue";
import { useOrderStore } from "@/store/order";
import { useProductStore as useProduct } from "@/store/product";
import { useStockStore } from "@/store/stock";
import { useUserStore } from "@/store/user"


const props = defineProps(['orderType', 'orderId', 'shipGroupSeqId']);

const rejectEntireOrderReasonId = ref("REJ_AVOID_ORD_SPLIT");
const isCancelationSyncJobEnabled = ref(false);
const isProcessRefundEnabled = ref(false);
const cancelJobNextRunTime = ref("");
const orderTimeline = ref([] as any);
const hasCancelledItems = ref(false);
const hasRejectedItems = ref(false);
const pickers = ref([] as any);
const picklistDate = ref(0);
const orderStatus = ref("");

const order = computed(() => useOrderStore().current);
const getProduct = computed(() => useProduct().getProduct);
const getInventoryInformation = computed(() => useStockStore().getInventoryInformation);
const getCarrierName = (partyId: string) => useOrderStore().getCarrierName(partyId);
const getFacilityName = (facilityId: string) => useProductStore().getFacilityName(facilityId);
const isHandoverProofEnabled = computed(() => useProductStore().isHandoverProofEnabled)
const isPrintPackingSlipEnabled = computed(() => useProductStore().isPrintPackingSlipEnabled)
const isTrackingEnabled = computed(() => useProductStore().isTrackingEnabled)
const isPrintPicklistsEnabled = computed(() => useProductStore().isPrintPicklistsEnabled)
const isRequestTransferEnabled = computed(() => useProductStore().isRequestTransferEnabled)
const isPartialOrderRejectionEnabled = computed(() => useProductStore().isPartialOrderRejectionEnabled)
const rejectReasons = computed(() => useOrderStore().getRejectReasons);
const cancelReasons = computed(() => useOrderStore().getCancelReasons);
const productIdentificationPref = computed(() => useProductStore().getProductIdentificationPref);
const currentFacility = computed(() => useProductStore().getCurrentFacility);

function isEntireOrderRejectionEnabled() {
  return !isPartialOrderRejectionEnabled.value
}

function formatDateTime(date: any) {
  return DateTime.fromMillis(date).toLocaleString({ hour: "numeric", minute: "2-digit", day: "numeric", month: "short", year: "numeric", hourCycle: "h12" })
}

function findTimeDiff(startTime: any, endTime: any) {
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
}

function sortSequence(sequence: any, sortOnField: string) {
  return sequence.sort((a: any, b: any) => {
    if(a[sortOnField] === b[sortOnField]) return 0;

    if(a[sortOnField] == undefined) return 1;
    if(b[sortOnField] == undefined) return -1;

    return a[sortOnField] - b[sortOnField]
  })
}

function getRejectionReasonDescription(rejectionReasonId: string) {
  const reason = rejectReasons.value?.find((reason: any) => reason.enumId === rejectionReasonId)
  return reason?.enumDescription ? reason.enumDescription : reason?.description ? reason.description : reason?.enumId;
}

function getCancelReasonDescription(cancelReasonId: string) {
  const reason = cancelReasons.value?.find((reason: any) => reason.enumId === cancelReasonId)
  return reason?.enumDescription ? reason.enumDescription : reason?.enumId;
}

function canRequestTransfer(orderRef: any): boolean {
  return (
    orderRef?.shipGroup?.shipmentMethodTypeId === 'STOREPICKUP' &&
    orderRef?.statusId === 'ORDER_APPROVED' &&
    !orderRef?.shipGroup?.shipmentId &&
    !orderRef?.readyToHandover &&
    !orderRef?.readyToShip &&
    !orderRef?.rejected &&
    !orderRef?.shipGroup?.items?.some((item: any) => item.rejectReason)
  );
}

async function fetchJobs() {
  const params = {
    "inputFields": {
      "statusId": "SERVICE_PENDING",
      "statusId_op": "equals",
      "systemJobEnumId": "JOB_EXP_CAN_S_ORD",
      "systemJobEnumId_op": "equals"
    },
    "fieldList": ["systemJobEnumId", "statusId", "tempExprId", "nextExecutionDateTime"],
    "noConditionFind": "Y",
    "viewSize": 1
  }

  try {
    const resp = await useOrderStore().fetchJobInformation(params)
    if(!commonUtil.hasError(resp) && resp.data.count > 0) {
      isCancelationSyncJobEnabled.value = true;
      cancelJobNextRunTime.value = resp.data.docs[0].nextExecutionDateTime;
    }

    const refundStatusResp = await useOrderStore().getProcessRefundStatus(useProductStore().getCurrentEComStore.productStoreId)

    if(!commonUtil.hasError(refundStatusResp) && refundStatusResp.data.count > 0) {
      isProcessRefundEnabled.value = refundStatusResp.data.docs[0].processRefund === "Y";
    }
  } catch(err) {
    logger.error(err)
  }
}

async function fetchProductInventory(productId: string, shipGroupSeqId: any) {
  useOrderStore().updateOrderItemFetchingStatus({ productId, shipGroupSeqId })
  await useStockStore().fetchProductInventory({ productId })
  useOrderStore().updateOrderItemFetchingStatus({ productId, shipGroupSeqId })
}

async function getOrderDetail(orderId: any, shipGroupSeqId: any, orderType: any) {
  const payload = {
    facilityId: (currentFacility.value as any)?.facilityId,
    orderId,
    shipGroupSeqId
  }
  await useOrderStore().getOrderDetail({ payload, orderType })
}

async function fetchRejectReasons() {
  await useOrderStore().fetchRejectReasons();
}

async function fetchCancelReasons() {
  await useOrderStore().fetchCancelReasons();
}

async function fetchShipmentStatusHistory() {
  let shipmentStatusInfo = []
  try {
      const shipmentStatusResp = await api({
        url: `/poorti/shipments/${order.value.shipmentId}/statusHistory`,
        method: "GET",
        params: {
          pageSize: 50
        }
      }) as any

      if(!commonUtil.hasError(shipmentStatusResp) && shipmentStatusResp.data?.length) {
        shipmentStatusInfo = shipmentStatusResp.data
      }
  } catch(err) {
    logger.error("Failed to fetch route segment info for order")
  }

  return shipmentStatusInfo
}

async function fetchOrderChangeHistory() {
  let orderChangeHistory = []
  try {
    const resp = await api({
      url: `/oms/orders/${order.value.orderId}/facilityChange`,
      method: "GET",
      params: {
        orderByField: "changeDatetime DESC",
        pageSize: 100
      }
    });
    if(!commonUtil.hasError(resp) && resp.data.length) {
      orderChangeHistory = resp.data.filter((event: any) =>
        event.facilityId === "PICKUP_REJECTED" || event.fromFacilityId === "PICKUP_REJECTED"
      )
    } else {
      throw resp.data;
    }
  } catch(err) {
    logger.error("Failed to fetch order change history", err)
  }

  return orderChangeHistory
}

async function fetchOrderCommunicationEvent() {
  let orderCommunicationEvent = []
  try {
    const resp = await api({
      url: "/oms/communicationEvents",
      method: "GET",
      params: {
        orderIds: [order.value.orderId],
        communicationEventTypeId: "EMAIL_COMMUNICATION",
        pageIndex: 0,
        pageSize: 50
      }
    });
    if(!commonUtil.hasError(resp) && resp.data?.communicationEventList?.length) {
      orderCommunicationEvent = resp.data.communicationEventList.filter((event: any) => {
        return event.subject && event.subject.includes("pickup")
      })
    } else {
      throw resp.data;
    }
  } catch(err) {
    logger.error("Failed to fetch communication events for order", err)
  }

  return orderCommunicationEvent
}

async function prepareOrderTimeline(paramsToUpdate ?: any) {
  const timeline = []

  const shipmentStatusInfo = await fetchShipmentStatusHistory();

  orderStatus.value = orderUtil.getOrderStatus({
    ...(order.value as any),
    ...paramsToUpdate
  }, order.value.shipGroup, props.orderType)

  let orderChangeHistory = await fetchOrderChangeHistory();
  const orderPickupEmailCommnicationEvent = await fetchOrderCommunicationEvent();

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

  await useProductStore().fetchFacilities([...new Set(facilityIds)])
  await useOrderStore().fetchEnumerations([...new Set(enumIds)])

  const orderTimelineComponents = [...communicationEvents, ...orderChangeHistory]

  if(order.value.orderDate) {
    timeline.push({
      label: "Created in Shopify",
      id: "orderDate",
      value: order.value.orderDate,
      icon: sunnyOutline,
      valueType: "date-time-millis"
    })
  }

  if(order.value.entryDate) {
    timeline.push({
      label: "Imported from Shopify",
      id: "entryDate",
      value: order.value.entryDate,
      icon: downloadOutline,
      valueType: "date-time-millis",
      timeDiff: findTimeDiff(order.value.orderDate, order.value.entryDate)
    })
  }

  if(order.value.approvedDate) {
    timeline.push({
      label: "Approved for fulfillment",
      id: "approvedDate",
      value: order.value.approvedDate,
      icon: pulseOutline,
      valueType: "date-time-millis",
      timeDiff: findTimeDiff(order.value.orderDate, order.value.approvedDate)
    })
  }

  if((order.value.pickers?.length && order.value.picklistDate) || pickers.value.length) {
    const date = order.value.picklistDate || picklistDate.value || DateTime.now().toMillis()
    timeline.push({
      label: "Picker assigned",
      id: "pickerInfo",
      value: date,
      icon: personAddOutline,
      valueType: "date-time-millis",
      timeDiff: findTimeDiff(order.value.orderDate, date),
      metaData: order.value.pickers || pickers.value
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
        metaData = useProductStore().getFacilityName(component.fromFacilityId) + ": " + useOrderStore().getEnumDescription(component.changeReasonEnumId)
        if (cancelReasons.value.some((reason: any) => reason.enumId === component.changeReasonEnumId)) {
          label = "Cancelled"
          id = "cancelled"
          icon = banSharp
        }
      } else if(component.fromFacilityId === "PICKUP_REJECTED") {
        label = "Assigned for fulfillment"
        id = "assigned"
        icon = medkitOutline
        metaData = useProductStore().getFacilityName(component.facilityId) + ": " + useOrderStore().getEnumDescription(component.changeReasonEnumId)
      }

      timeline.push({
        label,
        id,
        value: component.sortDate,
        icon,
        valueType: "date-time-millis",
        timeDiff: findTimeDiff(order.value.orderDate, component.sortDate),
        metaData
      })
    })
  }

  if(order.value.completedDate || props.orderType === "completed") {
    timeline.push({
      label: order.value.shipGroup.shipmentMethodTypeId === "STOREPICKUP" ? "Picked up" : "Order completed",
      id: "completedDate",
      value: order.value.completedDate ? order.value.completedDate : undefined,
      icon: checkmarkDoneOutline,
      valueType: "date-time-millis",
      timeDiff: order.value.completedDate ? findTimeDiff(order.value.orderDate, order.value.completedDate) : ""
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
      timeDiff: findTimeDiff(order.value.orderDate, getShipmentPackedDate.statusDate)
    })
  }

  orderTimeline.value = sortSequence(timeline, "value")
}

async function createPicklist(orderRef: any, selectedPicker: any) {
  let resp;
  try {
    const payload = {
      packageName: "A", //default package name
      facilityId: (currentFacility.value as any)?.facilityId,
      shipmentMethodTypeId: orderRef.shipGroup.shipmentMethodTypeId,
      statusId: "PICKLIST_ASSIGNED",        
      pickers: selectedPicker ? [{
        partyId: selectedPicker,
        roleTypeId: "WAREHOUSE_PICKER"
      }] : [],
      orderItems: orderRef.shipGroup?.items.map((item: { orderId: string, orderItemSeqId: string, shipGroupSeqId: string, productId: string, quantity: number }) => ({
        orderId: item.orderId,
        orderItemSeqId: item.orderItemSeqId,
        shipGroupSeqId: item.shipGroupSeqId,
        productId: item.productId,
        quantity: item.quantity
      }))
    };
    resp = await useOrderStore().createPicklist(payload);
    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Picklist created successfully", { picklistId: resp.data.picklistId }));
      await useOrderStore().printPicklist(resp.data.picklistId)
    } else {
      throw resp.data
    }
  } catch (err) {
    logger.error("Something went wrong while creating picklist", err);
  }
}

async function printPicklist(orderRef: any, shipGroup: any) {
  if(!isTrackingEnabled.value) {
    const resp = await useOrderStore().ensurePartyRole({
      partyId: "_NA_",
      roleTypeId: "WAREHOUSE_PICKER",
    })
    if(commonUtil.hasError(resp)) {
      commonUtil.showToast(translate("Something went wrong"))
      return;
    }
    await createPicklist(orderRef, "_NA_")
    return;
  }
  await useOrderStore().printPicklist(shipGroup.picklistId)
}

async function assignPicker(orderRef: any, shipGroup: any, facilityId: any) {
  const assignPickerModal = await modalController.create({
    component: AssignPickerModal,
    componentProps: { order: orderRef, shipGroup, facilityId }
  });
  assignPickerModal.onDidDismiss().then(async(result: any) => {
    if(result.data?.selectedPicker) {
      emitter.emit("presentLoader");
      await createPicklist(orderRef, result.data.selectedPicker);
      await useOrderStore().packShipGroupItems({ order: orderRef, shipGroup })
      await getOrderDetail(props.orderId, props.shipGroupSeqId, props.orderType);
      emitter.emit("dismissLoader");
    }
  })

  return assignPickerModal.present();
}

async function editPicker(orderRef: any) {
  const editPickerModal = await modalController.create({
    component: EditPickerModal,
    componentProps: { order: orderRef }
  });

  editPickerModal.onDidDismiss().then((result) => {
    if(result.data?.selectedPicker){
      const selectedPicker = result.data.selectedPicker
      orderRef.pickers = selectedPicker.name
      orderRef.pickerIds = [selectedPicker.id]
      useOrderStore().updateCurrent({ order: orderRef })
      prepareOrderTimeline();
    }
  })
  return editPickerModal.present();
}

async function readyForPickup(orderData: any, shipGroup: any) {
  if (isTrackingEnabled.value && !shipGroup.picklistId) return assignPicker(orderData, shipGroup, (useProductStore().getCurrentFacility as any)?.facilityId);
  const pickup = shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
  const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
  const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: orderData.customerName, space: '<br/><br/>' }) : '';

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
          alert.dismiss();
          emitter.emit("presentLoader", { message: "Loading...", backdropDismiss: false });
          if (!shipGroup.shipmentId) {
            await printPicklist(orderData, shipGroup)
          }
          await useOrderStore().packShipGroupItems({ order: orderData, shipGroup }).then(async (resp: any) => {
            if (!commonUtil.hasError(resp)) {
              await getOrderDetail(props.orderId, props.shipGroupSeqId, props.orderType);
              prepareOrderTimeline({ statusId: "SHIPMENT_PACKED" });
            }
          })
          emitter.emit("dismissLoader");
        }
      }]
    });
  return alert.present();
}

async function deliverShipment(orderRef: any) {
  const pickup = orderRef.shipGroup.shipmentMethodTypeId === 'STOREPICKUP';
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
          await useOrderStore().deliverShipmentFromDetail(orderRef).then((resp: any) => {
            if(!commonUtil.hasError(resp)) {
              getOrderDetail(props.orderId, props.shipGroupSeqId, props.orderType);
              prepareOrderTimeline({ statusId: "ORDER_COMPLETED" });
            }
          })
        }
      }]
    });
  return alert.present();
}

async function openOrderItemRejHistoryModal() {
  const orderItemRejHistoryModal = await modalController.create({
    component: OrderItemRejHistoryModal,
  });
  return orderItemRejHistoryModal.present();
}

async function rejectOrder() {
  emitter.emit("presentLoader");

  let orderRef = JSON.parse(JSON.stringify(order.value))
  const isEntireOrderRejectionValue = isEntireOrderRejectionEnabled();
  const rejectToFacilityId = orderRef.shipGroup.shipmentMethodTypeId === "STOREPICKUP" ? "PICKUP_REJECTED" : "REJECTED_ITM_PARKING";
  const itemsToReject: any[] = [];
  
  for (const item of orderRef.shipGroup.items) {
    const shouldReject = isEntireOrderRejectionValue || item.rejectReason;

    if (shouldReject) {
      itemsToReject.push({
        orderItemSeqId: item.orderItemSeqId,
        quantity: parseInt(item.quantity),
        maySplit: 'Y',
        updateQOH: false,
        rejectionReasonId: item.rejectReason || rejectEntireOrderReasonId.value,
        kitComponents: orderUtil.isKit(item) ? item.rejectedComponents || [] : []
      });
    }
  }
  if (itemsToReject.length > 0) {
    const payload = {
      orderId: orderRef.orderId,
      rejectToFacilityId,
      items: itemsToReject
    };
    try {
      const resp = await useOrderStore().rejectOrderItems(payload);

      if (!commonUtil.hasError(resp)) {
        const rejectedSeqIds = new Set(itemsToReject.map(i => i.orderItemSeqId));
        orderRef.shipGroup.items = orderRef.shipGroup.items.filter(
          (item: any) => !rejectedSeqIds.has(item.orderItemSeqId)
        );
        
        const toastMessage = orderRef.shipGroup.items.length === 0 ? translate('All items were rejected from the order.', { orderId: orderRef.orderName ?? orderRef.orderId }) : translate('Some items were rejected from the order.', { orderId: orderRef.orderName ?? orderRef.orderId });
        commonUtil.showToast(toastMessage);
      }
    } catch (err) {
      logger.error("Something went wrong while rejecting order items:", err);
    }
  }

  if(!orderRef.shipGroup.items.length) orderRef.rejected = true;

  await useOrderStore().updateCurrent({ order: orderRef });
  hasRejectedItems.value = order.value.shipGroup.items.some((item: any) => item.rejectReason);

  if(order.value.shipGroup?.shipmentMethodTypeId === "STOREPICKUP") {
    prepareOrderTimeline();
  }

  emitter.emit("dismissLoader");
}

async function cancelOrder(orderRef: any) {
  const cancelOrderConfirmModal = await modalController.create({
    component: ConfirmCancelModal,
    componentProps: {
      order: orderRef,
      isCancelationSyncJobEnabled: isCancelationSyncJobEnabled.value,
      isProcessRefundEnabled: isProcessRefundEnabled.value,
      cancelJobNextRunTime: cancelJobNextRunTime.value,
      orderType: props.orderType
    }
  });

  cancelOrderConfirmModal.onDidDismiss().then(() => {
    hasCancelledItems.value = order.value.shipGroup.items.some((item: any) => item.cancelReason);
    if(order.value.shipGroup.shipmentMethodTypeId === "STOREPICKUP") {
      prepareOrderTimeline();
    }
  })

  return cancelOrderConfirmModal.present();
}

async function printPackingSlip(orderRef: any) {
  if(orderRef.isGeneratingPackingSlip) {
    return;
  }

  orderRef.isGeneratingPackingSlip = true;
  await useOrderStore().printPackingSlip([orderRef.shipGroup.shipmentId]);
  orderRef.isGeneratingPackingSlip = false;
}

async function printShippingLabelAndPackingSlip(orderRef: any) {
  await useOrderStore().printShippingLabelAndPackingSlip([orderRef.shipGroup.shipmentId])
}

async function openInventoryDetailPopover(Event: any, item: any){
  const popover = await popoverController.create({
    component: InventoryDetailsPopover,
    event: Event,
    showBackdrop: false,
    componentProps: { item }
  });
  await popover.present();
}

async function fetchKitComponents(orderItem: any, orderRef: any, toggleKitComponents = true) {
  await useProduct().fetchProductComponents({ productId: orderItem.productId })

  if(toggleKitComponents) {
    orderItem.showKitComponents = !orderItem.showKitComponents
    useOrderStore().updateCurrentOrderInfo(orderRef)
  }
}

async function openRejectReasonPopover(ev: Event, item: any, orderRef: any) {
  const reportIssuePopover = await popoverController.create({
    component: ReportAnIssuePopover,
    event: ev,
    translucent: true,
    showBackdrop: false,
  });

  reportIssuePopover.present();

  const result = await reportIssuePopover.onDidDismiss();

  if (result.data) {
    updateRejectReason(result.data, item, orderRef)
  }
}

async function openCancelReasonPopover(ev: Event, item: any, orderRef: any) {
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
    updateCancelReason(result.data, item, orderRef)
  }
}

async function updateCancelReason(updatedReason: string, item: any, orderRef: any) {
  item.cancelReason = updatedReason;
  hasCancelledItems.value = true
  useOrderStore().updateCurrent({ order: orderRef })
}

async function updateRejectReason(updatedReason: string, item: any, orderRef: any) {
  item.rejectReason = updatedReason;

  if(orderUtil.isKit(item)) {
    if(!useProduct().getProduct(item.productId).productComponents) await fetchKitComponents(item, orderRef, false)
    item.rejectedComponents = useProduct().getProduct(item.productId).productComponents?.map((product: any) => product.productIdTo)
  }

  hasRejectedItems.value = true
  useOrderStore().updateCurrent({ order: orderRef })
}

async function sendReadyForPickupEmail(orderRef: any) {
  const header = translate("Resend email")
  const message = translate("An email notification will be sent to that their order is ready for pickup.", { customerName: orderRef.customerName });

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
            const resp = await useOrderStore().sendPickupScheduledNotification({ shipmentId: orderRef.shipmentId });
            if (!commonUtil.hasError(resp)) {
              commonUtil.showToast(translate("Email sent successfully"))
            } else {
              commonUtil.showToast(translate("Something went wrong while sending the email."))
            }
          } catch (error) {
            commonUtil.showToast(translate("Something went wrong while sending the email."))
            logger.error(error)
          }
        }
      }]
    });
  return alert.present();
}

async function openGiftCardActivationModal(item: any) {
  const modal = await modalController.create({
    component: GiftCardActivationModal,
    componentProps: { item, orderId: props.orderId, customerId: order.value.customerId, currencyUom: order.value.currencyUom }
  })
  
  modal.onDidDismiss().then((result: any) => {
    if(result.data?.isGCActivated) {
      useOrderStore().updateCurrentItemGCActivationDetails({ item, orderId: props.orderId, orderType: props.orderType, isDetailsPage: true })
    }
  })
  modal.present();
}

async function confirmRequestTransfer(orderRef: any) {
  const header = translate('Convert to Ship-to-Store');
  const message = translate("The item will be sourced from another store or warehouse and shipped to this location for customer pickup. {space} You can view the order in the Ship-to-Store section by clicking the trail icon in the upper-right corner of the page. {space} Do you want to continue?", { space: '<br/><br/>' });

  const alert = await alertController.create({
    header,
    message,
    buttons: [{ 
      text: translate('Cancel'),
      role: 'cancel'
    }, {
      text: translate('Convert'),
      handler: async () => await requestTransfer(orderRef)
    }]
  });

  return alert.present();
}

async function requestTransfer(orderRef: any) {
  emitter.emit("presentLoader");
  try {
    const resp = await useOrderStore().convertToShipToStore({
      orderId: orderRef.orderId,
      shipGroupSeqId: orderRef.shipGroup.shipGroupSeqId
    });
    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate('Order marked as ship to store'));
      router.push({ path: '/tabs/orders' });
    } else {
      commonUtil.showToast(translate('Failed to mark order as ship to store'));
      logger.error('Ship-to-Store conversion failed', resp);
    }
  } catch (err) {
    logger.error(err);
    commonUtil.showToast(translate("Something went wrong"));
  }
  emitter.emit("dismissLoader");
}

async function removeRejectionReason(item: any, orderRef: any) {
  delete item["rejectedComponents"];
  item.rejectReason = "";
  hasRejectedItems.value = orderRef.shipGroup.items.some((item: any) => item.rejectReason);
  useOrderStore().updateCurrent({ order: orderRef })
}

async function removeCancellationReason(item: any, orderRef: any) {
  item.cancelReason = "";
  hasCancelledItems.value = orderRef.shipGroup.items.some((item: any) => item.cancelReason);
  useOrderStore().updateCurrent({ order: orderRef })
}

function rejectKitComponent(orderRef: any, item: any, componentProductId: string) {
  let rejectedComponents = item.rejectedComponents ? item.rejectedComponents : []
  if (rejectedComponents.includes(componentProductId)) {
    rejectedComponents = rejectedComponents.filter((rejectedComponent: any) => rejectedComponent !== componentProductId)
  } else {
    rejectedComponents.push(componentProductId);
  }
  item.rejectedComponents = rejectedComponents;
  orderRef.shipGroup.items.map((orderItem: any) => {
    if (orderItem.orderItemSeqId === item.orderItemSeqId) {
      orderItem.rejectedComponents = rejectedComponents;
    }
  })
  useOrderStore().updateCurrent({ order: orderRef })
}

onMounted(async () => {
  emitter.emit("presentLoader")
  await getOrderDetail(props.orderId, props.shipGroupSeqId, props.orderType);

  await fetchRejectReasons()
  await fetchCancelReasons()

  if(props.orderType === "packed") {
    fetchJobs();
    hasCancelledItems.value = order.value.shipGroup?.items.some((item: any) => item.cancelReason);
  }
  if(props.orderType === "open") {
    hasRejectedItems.value = order.value.shipGroup?.items.some((item: any) => item.rejectReason);
  }

  await prepareOrderTimeline();

  emitter.emit("dismissLoader")
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
