<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ translate("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="orderType === 'packed' && order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP'" class="ion-hide-md-up" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="sendReadyForPickupEmail(order)">
            <ion-icon slot="icon-only" :icon="mailOutline" />
          </ion-button>
          <ion-button :disabled="!order?.orderId" @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="orderType === 'open'" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped"  @click="printPicklist(order, order.part)">
            <ion-icon slot="icon-only" :icon="printOutline" />
          </ion-button>
          <ion-button v-else-if="orderType === 'packed' && getBopisProductStoreSettings('PRINT_PACKING_SLIPS')" :class="order.part?.shipmentMethodEnum?.shipmentMethodEnumId !== 'STOREPICKUP' ? 'ion-hide-md-up' : ''" :disabled="!order?.orderId || !hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped" @click="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? printPackingSlip(order) : printShippingLabelAndPackingSlip(order)">
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
        <aside>
          <!-- Timeline -->
          <ion-item lines="none">
            <ion-icon slot="start" :icon="timeOutline" class="mobile-only" />
            <h2>{{ translate("Timeline") }}</h2>
            <!-- <ion-badge slot="end" :color="getColorByDesc(orderStatuses[order.statusId].label) || getColorByDesc('default')">{{ translate(orderStatuses[order.statusId].label) }}</ion-badge> -->
          </ion-item>

          <ion-list class="desktop-only">
            <ion-item v-if="order.orderDate">
              <ion-icon :icon="sunnyOutline" slot="start" />
              <ion-label>
                {{ translate("Created in Shopify") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.orderDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.entryDate">
              <ion-icon :icon="downloadOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.entryDate) }}</p>
                {{ translate("Imported from Shopify") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.entryDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.approvedDate">
              <ion-icon :icon="pulseOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.approvedDate) }}</p>
                {{ translate("Approved for fulfillment") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.approvedDate) }}</ion-note>
            </ion-item>
            <ion-item v-if="order.completedDate">
              <ion-icon :icon="pulseOutline" slot="start" />
              <ion-label>
                <p>{{ findTimeDiff(order.orderDate, order.completedDate) }}</p>
                {{ translate("Order completed") }}
              </ion-label>
              <ion-note slot="end">{{ formatDateTime(order.completedDate) }}</ion-note>
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

          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small" />
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                <ion-badge color="dark" v-if="isKit(item)">{{ translate("Kit") }}</ion-badge>
              </ion-label>
              <template v-if="orderType === 'open' && !(order.readyToHandover || order.readyToShip)">
                <!-- Rejection Reason -->
                <ion-chip v-if="item.rejectReason" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                  <ion-icon :icon="closeCircleOutline" @click.stop="removeRejectionReason($event, item, order)"/>
                  <ion-label>{{ getRejectionReasonDescription(item.rejectReason) }}</ion-label>
                  <ion-icon :icon="caretDownOutline"/>
                </ion-chip>
                <ion-chip v-else-if="isEntierOrderRejectionEnabled(order)" outline color="danger" @click.stop="openRejectReasonPopover($event, item, order)">
                  <ion-label>{{ getRejectionReasonDescription(rejectEntireOrderReasonId) ? getRejectionReasonDescription(rejectEntireOrderReasonId) : translate('Reject entire order')}}</ion-label>
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

              <div class="show-kit-components" slot="end">
                <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                <div v-else-if="getProductStock(item.productId).quantityOnHandTotal >= 0" class="atp-info">
                  <ion-note slot="end"> {{ translate("on hand", { count: getProductStock(item.productId).quantityOnHandTotal ?? '0' }) }} </ion-note>
                  <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                    <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                  </ion-button>
                </div>
                <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId, order.shipGroupSeqId)">
                  <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                </ion-button>

                <ion-button v-if="isKit(item)" fill="clear" size="small" @click.stop="fetchKitComponents(item)">
                  <ion-icon v-if="showKitComponents" color="medium" slot="icon-only" :icon="chevronUpOutline"/>
                  <ion-icon v-else color="medium" slot="icon-only" :icon="listOutline"/>
                </ion-button>
              </div>  
            </ion-item>

            <template v-if="isKit(item) && showKitComponents && !getProduct(item.productId)?.productComponents">
              <ion-item lines="none">
                <ion-skeleton-text animated style="height: 80%;"/>
              </ion-item>
              <ion-item lines="none">
                <ion-skeleton-text animated style="height: 80%;"/>
              </ion-item>
            </template>
            <template v-else-if="isKit(item) && showKitComponents && getProduct(item.productId)?.productComponents">
              <ion-card v-for="(productComponent, index) in getProduct(item.productId).productComponents" :key="index">
                <ion-item lines="none">
                  <ion-thumbnail slot="start">
                    <DxpShopifyImg :src="getProduct(productComponent.productIdTo).mainImageUrl" size="small"/>
                  </ion-thumbnail>
                  <ion-label>
                    <p class="overline">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(productComponent.productIdTo)) }}</p>
                    {{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(productComponent.productIdTo)) : productComponent.productIdTo }}
                  </ion-label>
                  <ion-checkbox slot="end" aria-label="Rejection Reason kit component" v-if="item.rejectReason || isEntierOrderRejectionEnabled(order)" :checked="item.rejectedComponents?.includes(productComponent.productIdTo)" @ionChange="rejectKitComponent(order, item, productComponent.productIdTo)" />
                </ion-item>
              </ion-card>
            </template>
          </ion-card>
          <p v-if="!order.part?.items?.length && orderType === 'open'" class="empty-state">{{ translate("All order items are rejected") }}</p>
          <p v-if="!order.part?.items?.length && orderType === 'packed'" class="empty-state">{{ translate("All order items are cancelled") }}</p>

          <ion-item lines="none" v-if="orderType === 'open' && order.part?.items?.length">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected || order.hasRejectedItem" @click="readyForPickup(order, order.part)">
              <ion-icon slot="start" :icon="bagCheckOutline"/>
              {{ order?.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Ready for pickup") : translate("Ready to ship") }}
            </ion-button>
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected || !order.hasRejectedItem" color="danger" fill="outline" @click="rejectOrder()">
              {{ translate("Reject Items") }}
            </ion-button>
          </ion-item>

          <ion-item lines="none" v-else-if="orderType === 'packed' && order.part?.items?.length" class="ion-hide-md-down">
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled || order.hasCancelledItems" expand="block" @click="deliverShipment(order)">
              <ion-icon slot="start" :icon="checkmarkDoneOutline"/>
              {{ order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? translate("Handover") : translate("Ship") }}
            </ion-button>
            <ion-button size="default" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled || !order.hasCancelledItems" expand="block" fill="outline" @click="cancelOrder(order)">
              {{ translate("Cancel Items") }}
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
              <div v-if="order.orderPayments?.length">
                <ion-list v-for="(orderPayment, index) in order.orderPayments" :key="index">
                  <ion-item lines="none">
                    <ion-label class="ion-text-wrap">
                      <p class="overline">{{ orderPayment.methodTypeId }}</p>
                      <ion-label>{{ translate(getPaymentMethodDesc(orderPayment.methodTypeId)) || orderPayment.methodTypeId }}</ion-label>
                      <ion-note :color="getColorByDesc(getStatusDesc(orderPayment.paymentStatus))">{{ translate(getStatusDesc(orderPayment.paymentStatus)) }}</ion-note>
                    </ion-label>
                    <div slot="end" class="ion-text-end">
                      <ion-badge v-if="order.orderPayments.length > 1 && index === 0" color="dark">{{ translate("Latest") }}</ion-badge>
                      <ion-label slot="end">{{ formatCurrency(orderPayment.amount, order.currencyUom) }}</ion-label>
                    </div>
                  </ion-item>
                </ion-list>
              </div>
              <p v-else class="empty-state">
                {{ translate("No payments found") }}
              </p>
            </ion-card>
          </div>

          <ion-item lines="none" v-if="order.shipGroups?.length">
            <ion-label>{{ translate("Other shipments in this order") }}</ion-label>
          </ion-item>
          <div class="ion-padding">
            <ion-card v-for="shipGroup in order.shipGroups" :key="shipGroup.shipmentId">
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
    
              <ion-item lines="none" v-for="item in shipGroup.items" :key="item">
                <ion-thumbnail slot="start">
                  <DxpShopifyImg :src="getProduct(item.productId).mainImageUrl" size="small"/>
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <h2>{{ getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) ? getProductIdentificationValue(productIdentificationPref.primaryId, getProduct(item.productId)) : getProduct(item.productId).productName }}</h2>
                  <p class="ion-text-wrap">{{ getProductIdentificationValue(productIdentificationPref.secondaryId, getProduct(item.productId)) }}</p>
                </ion-label>

                <div slot="end">
                  <ion-spinner v-if="item.isFetchingStock" color="medium" name="crescent" />
                  <div v-else-if="getProductStock(item.productId).quantityOnHandTotal >= 0" class="atp-info">
                    <ion-note slot="end"> {{ translate("on hand", { count: getProductStock(item.productId).quantityOnHandTotal ?? '0' }) }} </ion-note>
                    <ion-button fill="clear" @click.stop="openInventoryDetailPopover($event, item)">
                      <ion-icon slot="icon-only" :icon="informationCircleOutline" color="medium" />
                    </ion-button>
                  </div>
                  <ion-button v-else fill="clear" @click.stop="fetchProductStock(item.productId, shipGroup.shipGroupSeqId)">
                    <ion-icon color="medium" slot="icon-only" :icon="cubeOutline" />
                  </ion-button>
                </div>
              </ion-item>
            </ion-card>
          </div>
        </section>
      </main>

      <ion-fab v-if="orderType === 'open' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.readyToHandover || order.readyToShip || order.rejected" @click="readyForPickup(order, order.part)">
          <ion-icon :icon="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? bagHandleOutline : giftOutline" />
        </ion-fab-button>
      </ion-fab>
      <ion-fab v-else-if="orderType === 'packed' && order?.orderId" class="ion-hide-md-up" vertical="bottom" horizontal="end" slot="fixed" >
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order.handovered || order.shipped || order.cancelled" @click="deliverShipment(order)">
          <ion-icon :icon="order.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? accessibilityOutline : checkmarkOutline" />
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
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
  popoverController,
  IonItemOption
} from "@ionic/vue";
import { computed, defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import {
  accessibilityOutline,
  callOutline,
  cashOutline,
  copyOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  checkmarkOutline,
  cubeOutline,
  giftOutline,
  informationCircleOutline,
  locateOutline,
  mailOutline,
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
  caretDownOutline
} from "ionicons/icons";
import { useRouter } from 'vue-router'
import { Actions, hasPermission } from '@/authorization'
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import AssignPickerModal from "@/views/AssignPickerModal.vue";
import { copyToClipboard, formatCurrency, getColorByDesc, getFeature, showToast } from '@/utils'
import { DateTime } from "luxon";
import { api, hasError } from '@/adapter';
import { OrderService } from "@/services/OrderService";
import { getProductIdentificationValue, translate, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components";
import EditPickerModal from "@/components/EditPickerModal.vue";
import emitter from '@/event-bus'
import logger from "@/logger";
import InventoryDetailsPopover from '@/components/InventoryDetailsPopover.vue'
import { isKit } from '@/utils/order'
import ReportAnIssuePopover from "@/components/ReportAnIssuePopover.vue";
import { UserService } from "@/services/UserService";
import ConfirmCancelModal from "@/components/ConfirmCancelModal.vue";

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
    IonSpinner,
    IonThumbnail,
    IonTitle,
    IonToolbar,
    IonFab,
    IonFabButton,
  },
  data() {
    return {
      customerEmail: '',
      statusColor: {
        'PAYMENT_AUTHORIZED': '',
        'PAYMENT_CANCELLED': 'warning',
        'PAYMENT_DECLINED': 'warning',
        'PAYMENT_NOT_AUTH': 'warning',
        'PAYMENT_NOT_RECEIVED': 'warning',
        'PAYMENT_RECEIVED': '',
        'PAYMENT_REFUNDED': 'warning',
        'PAYMENT_SETTLED': ''
      } as any,
      showKitComponents: false,
      rejectEntireOrderReasonId: "REJ_AVOID_ORD_SPLIT",
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      partialOrderRejectionConfig: 'user/getPartialOrderRejectionConfig',
      getPaymentMethodDesc: 'util/getPaymentMethodDesc',
      getStatusDesc: 'util/getStatusDesc',
      getProduct: 'product/getProduct',
      getProductStock: 'stock/getProductStock',
      getfacilityTypeDesc: 'util/getFacilityTypeDesc',
      getPartyName: 'util/getPartyName',
      getBopisProductStoreSettings: 'user/getBopisProductStoreSettings',
      rejectReasons: 'util/getRejectReasons',
      cancelReasons: 'util/getCancelReasons',
    })
  },
  props: ['orderType', 'orderId', 'orderPartSeqId'],
  methods: {
    async fetchProductStock(productId: string, shipGroupSeqId: any) {
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
      await this.store.dispatch('stock/fetchStock', { productId })
      this.store.dispatch('order/updateOrderItemFetchingStatus', { productId, shipGroupSeqId })
    },
    async assignPicker(order: any, part: any, facilityId: any) {
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data.selectedPicker) {
          await this.store.dispatch('order/packShipGroupItems', { order, part, facilityId, selectedPicker: result.data.selectedPicker })
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
        }
      })

      return editPickerModal.present();
    },
    async deliverShipment(order: any) {
      await this.store.dispatch('order/deliverShipment', order)
    },
    async openOrderItemRejHistoryModal() {
      const orderItemRejHistoryModal = await modalController.create({
        component: OrderItemRejHistoryModal,
      });
      return orderItemRejHistoryModal.present();
    },
    async getOrderDetail(orderId: any, orderPartSeqId: any, orderType: any) {
      const payload = {
        facilityId: this.currentFacility?.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", { payload, orderType })
      await this.store.dispatch("order/fetchPaymentDetail")
      await this.store.dispatch("order/getShippingPhoneNumber")
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
      for (const item of order.part.items) {
        let params = {} as any;
        if(this.isEntierOrderRejectionEnabled(order)) {
          params = {
            ...payload,
            rejectReason: item.rejectReason || this.rejectEntireOrderReasonId,
            facilityId: item.facilityId,
            orderItemSeqId: item.orderItemSeqId,
            shipmentMethodTypeId: order.part.shipmentMethodEnum.shipmentMethodEnumId,
            quantity: parseInt(item.quantity),
            ...(order.part.shipmentMethodEnum.shipmentMethodEnumId === "STOREPICKUP" && ({"naFacilityId": "PICKUP_REJECTED"})),
          }
        } else if(item.rejectReason) {
          params = {
            ...payload,
            rejectReason: item.rejectReason || this.rejectEntireOrderReasonId,
            facilityId: item.facilityId,
            orderItemSeqId: item.orderItemSeqId,
            shipmentMethodTypeId: order.part.shipmentMethodEnum.shipmentMethodEnumId,
            quantity: parseInt(item.quantity),
            ...(order.part.shipmentMethodEnum.shipmentMethodEnumId === "STOREPICKUP" && ({"naFacilityId": "PICKUP_REJECTED"})),
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
              order["part"] = {
                ...order.part,
                items: order.part.items.filter((orderItem: any) => !(orderItem.orderItemSeqId === item.orderItemSeqId && orderItem.productId === item.productId))
              }
            }
          } catch(err) {
            logger.error(`Something went wrong while rejecting order item ${item.productId}/${item.orderItemSeqId}`)
          }
        }
      }

      // If all the items are rejected then marking the whole order as rejected
      if(!order.part.items.length) order.rejected = true;

      this.store.dispatch("order/updateCurrent", { order });

      emitter.emit("dismissLoader");
    },
    async cancelOrder(order: any) {
      const cancelOrderConfirmModal = await modalController.create({
        component: ConfirmCancelModal,
        componentProps: {
          order
        }
      });

      return cancelOrderConfirmModal.present();
    },
    async readyForPickup(order: any, part: any) {
      if(this.getBopisProductStoreSettings('ENABLE_TRACKING') && order.isPicked !== 'Y') return this.assignPicker(order, part, this.currentFacility?.facilityId);
      const pickup = part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP';
      const header = pickup ? translate('Ready for pickup') : translate('Ready to ship');
      const message = pickup ? translate('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: order.customer.name, space: '<br/><br/>' }) : '';

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
                this.packShippingOrders(order, part);
              } else {
                this.store.dispatch('order/packShipGroupItems', {order, part, facilityId: this.currentFacility?.facilityId})
              }
            }
          }]
        });
      return alert.present();
    },
    async packShippingOrders(currentOrder: any, part: any) {
      try {
        const resp = await OrderService.packOrder({
          'picklistBinId': currentOrder.picklistBinId,
          'orderId': currentOrder.orderId
        })

        if(!hasError(resp)) {
          showToast(translate("Order packed and ready for delivery"));
          this.store.dispatch("order/updateCurrent", { order: { ...currentOrder, readyToShip: true } }) 
          this.store.dispatch("order/removeOpenOrder", { order: currentOrder, part })
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
    timeFromNow(time: any) {
      const timeDiff = DateTime.fromISO(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
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
    async sendReadyForPickupEmail(order: any) {
      const header = translate('Resend email')
      const message = translate('An email notification will be sent to that their order is ready for pickup.', { customerName: order.customer.name });

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          },{
            text: translate('Send'),
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
      const timeDiff = DateTime.fromMillis(endTime).diff(DateTime.fromMillis(startTime), ["years", "months", "days", "hours", "minutes"]);
      let diffString = "+ ";
      if(timeDiff.years) diffString += `${Math.round(timeDiff.years)} years `
      if(timeDiff.months) diffString += `${Math.round(timeDiff.months)} months `
      if(timeDiff.days) diffString += `${Math.round(timeDiff.days)} days `
      if(timeDiff.hours) diffString += `${Math.round(timeDiff.hours)} hours `
      if(timeDiff.minutes) diffString += `${Math.round(timeDiff.minutes)} minutes`
      return diffString
    },
    async fetchKitComponents(orderItem: any, toggleKitComponents = true) {
      await this.store.dispatch('product/fetchProductComponents', { productId: orderItem.productId })

      if(toggleKitComponents) {
        this.showKitComponents = !this.showKitComponents
      }
    },
    updateColor(stock: number) {
      return stock ? stock < 10 ? 'warning' : 'success' : 'danger';
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
      order.hasCancelledItems = true
      this.store.dispatch("order/updateCurrent", { order })
    },
    async updateRejectReason(updatedReason: string, item: any, order: any) {
      item.rejectReason = updatedReason;

      // If the current item is kit, and if its components are not available then fetch the components for the kit and mark those components as rejected components
      if(isKit(item)) {
        if(!this.getProduct(item.productId).productComponents) await this.fetchKitComponents(item, false)
        item.rejectedComponents = this.getProduct(item.productId).productComponents?.map((product: any) => product.productIdTo)
      }

      order.hasRejectedItem = true
      this.store.dispatch("order/updateCurrent", { order })
    },
    getRejectionReasonDescription(rejectionReasonId: string) {
      const reason = this.rejectReasons?.find((reason: any) => reason.enumId === rejectionReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    getCancelReasonDescription(cancelReasonId: string) {
      const reason = this.cancelReasons?.find((reason: any) => reason.enumId === cancelReasonId)
      return reason?.description ? reason.description : reason?.enumDescription ? reason.enumDescription : reason?.enumId;
    },
    isEntierOrderRejectionEnabled(order: any) {
      return (!this.partialOrderRejectionConfig || !this.partialOrderRejectionConfig.settingValue || !JSON.parse(this.partialOrderRejectionConfig.settingValue)) && order.hasRejectedItem
    },
    async removeRejectionReason(ev: Event, item: any, order: any) {
      delete item["rejectedComponents"];
      item.rejectReason = "";
      order.hasRejectedItem = order.part.items.some((item: any) => item.rejectReason);
      this.store.dispatch("order/updateCurrent", { order })
    },
    async removeCancellationReason(ev: Event, item: any, order: any) {
      item.cancelReason = "";
      order.hasCancelledItems = order.part.items.some((item: any) => item.cancelReason);
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
      order.part.items.map((orderItem: any) => {
        if (orderItem.orderItemSeqId === item.orderItemSeqId) {
          orderItem.rejectedComponents = rejectedComponents;
        }
      })
      this.store.dispatch("order/updateCurrent", { order })
    },
    async printPicklist(order: any, part: any) {
      if(order.isPicked === 'Y') {
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
        await this.createPicklist(order, "_NA_");
        return;
      }

      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId: this.currentFacility.facilityId }
      });

      assignPickerModal.onDidDismiss().then(async(result: any) => {
        if(result.data?.selectedPicker) {
          this.createPicklist(order, result.data.selectedPicker)
        }
      })

      return assignPickerModal.present();
    },
    async createPicklist(order: any, selectedPicker: any) {
      let resp;

      const items = order.part.items;
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
    }
  },
  async mounted() {
    emitter.emit("presentLoader")
    await this.getOrderDetail(this.orderId, this.orderPartSeqId, this.orderType);

    // fetch rejection reasons only when we get the orders information
    if(this.order.orderId) {
      this.orderType === "open" ? await this.fetchRejectReasons() : await this.fetchCancelReasons();
    }
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
      accessibilityOutline,
      bagCheckOutline,
      bagHandleOutline,
      bagRemoveOutline,
      callOutline,
      caretDownOutline,
      cashOutline,
      copyOutline,
      copyToClipboard,
      closeCircleOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      checkmarkOutline,
      chevronUpOutline,
      cubeOutline,
      currentFacility,
      downloadOutline,
      formatCurrency,
      getColorByDesc,
      getProductIdentificationValue,
      giftOutline,
      getFeature,
      hasPermission,
      informationCircleOutline,
      isKit,
      listOutline,
      locateOutline,
      printOutline,
      productIdentificationPref,
      pulseOutline,
      router,
      store,
      sunnyOutline,
      ticketOutline,
      timeOutline,
      mailOutline,
      sendOutline,
      translate,
      trashOutline
    };
  }
});
</script>

<style scoped>
.border-top {
  border-top: 1px solid #ccc;
}

ion-card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(314px, max-content));
  align-items: start;
}

@media (min-width: 768px) {
  main {
    display: grid;
    grid-template-columns: 1fr .75fr;
    gap: var(--spacer-base);
    max-width: 1200px;
    margin-inline: auto;
    margin-top: var(--spacer-xl);
  }

  aside {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>