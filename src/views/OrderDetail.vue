<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Order details") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openOrderItemRejHistoryModal()">
            <ion-icon slot="icon-only" :icon="timeOutline" />
          </ion-button>
          <ion-button v-if="!isDesktop" :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected" @click="updateOrder(order)">
            <ion-icon slot="icon-only" color="danger" :icon="bagRemoveOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main :class="{ 'desktop-only' : isDesktop && order?.part?.items?.length }">
        <OrderInfo v-if="!isDesktop" />
        <section>
          <ion-card v-for="(item, index) in order.part?.items" :key="index">
            <ProductListItem :item="item" />
            <ion-item v-if="partialOrderRejection" lines="none" class="border-top">
              <ion-button fill="clear" @click="openReportAnIssueModal(item)">
                {{ $t("Report an issue") }}
              </ion-button>
            </ion-item>
          </ion-card>
        </section>

        <aside v-if="isDesktop">
          <OrderInfo />
        </aside>
      </main>

      <ion-fab v-if="!isDesktop" vertical="bottom" horizontal="end" slot="fixed" @click="readyForPickup({ order, part: order.part })">
        <ion-fab-button :disabled="!hasPermission(Actions.APP_ORDER_UPDATE) || order?.readyToHandover || order?.rejected">
          <ion-icon :icon="bagHandleOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonPage,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  modalController,
  isPlatform,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters, useStore } from "vuex";
import { bagHandleOutline, bagRemoveOutline, timeOutline } from "ionicons/icons";
import ProductListItem from '@/components/ProductListItem.vue'
import { useRouter } from 'vue-router'
import { Actions, hasPermission } from '@/authorization'
import OrderItemRejHistoryModal from '@/components/OrderItemRejHistoryModal.vue';
import ReportAnIssueModal from '@/components/ReportAnIssueModal.vue';
import OrderInfo from '@/components/OrderInfo.vue';
import emitter from "@/event-bus"
import AssignPickerModal from "@/views/AssignPickerModal.vue";

export default defineComponent({
  name: "OrderDetail",
  props: ['orderId'],
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonPage,
    IonTitle,
    IonToolbar,
    ProductListItem,
    OrderInfo,
    IonFab,
    IonFabButton,
  },
  data () {
    return {
      customerEmail: '',
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      currentFacility: 'user/getCurrentFacility',
      configurePicker: "user/configurePicker",
      partialOrderRejection: 'user/partialOrderRejection'
    })
  },
  methods: {
    async assignPicker(order: any, part: any, facilityId: any) {      
      const assignPickerModal = await modalController.create({
        component: AssignPickerModal,
        componentProps: { order, part, facilityId }
      });
      return assignPickerModal.present();
    },
    async getOrderDetail(orderId: any, orderPartSeqId: any) {
      const payload = {
        facilityId: this.currentFacility.facilityId,
        orderId,
        orderPartSeqId
      }
      await this.store.dispatch("order/getOrderDetail", payload)
    },
    async updateOrder(order: any) {
      const alert = await alertController
        .create({
          header: this.$t('Update Order'),
          message: this.$t(`This order will be removed from your dashboard. This action cannot be undone.`, { space: '<br /><br />' }),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          }, {
            text: this.$t('Reject Order'),
            handler: () => {
              this.store.dispatch('order/setUnfillableOrderOrItem', { orderId: order.orderId, part: order.part }).then((resp) => {
                if (resp) {
                  // Mark current order as rejected
                  this.store.dispatch('order/updateCurrent', { order : { ...order, rejected: true } })
                }
              })
            },
          }]
        });
      return alert.present();
    },
    async openOrderItemRejHistoryModal(){
      const orderItemRejHistoryModal = await modalController.create({
        component: OrderItemRejHistoryModal,
      });
      return orderItemRejHistoryModal.present();
    },
    async openReportAnIssueModal(item: any){
      const reportAnIssueModal = await modalController.create({
        component: ReportAnIssueModal,
        componentProps: { item }
      });
      return reportAnIssueModal.present();
    },
    async readyForPickup (orderInfo: any) {
      if(this.configurePicker) return this.assignPicker(orderInfo.order, orderInfo.part, this.currentFacility.facilityId);
      const pickup = orderInfo.part?.shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP';
      const header = pickup ? this.$t('Ready for pickup') : this.$t('Ready to ship');
      const message = pickup ? this.$t('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: orderInfo.order.customer.name, space: '<br/><br/>'}) : '';

      const alert = await alertController
        .create({
          header: header,
          message: message,
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: header,
            handler: async () => {
              await this.store.dispatch('order/packShipGroupItems', { order: orderInfo.order, part: orderInfo.part, facilityId: this.currentFacility.facilityId})
            }
          }]
        });
      return alert.present();
    }
   },
  async mounted() {
    await this.getOrderDetail(this.$route.params.orderId, this.$route.params.orderPartSeqId);
    emitter.on('updateOrder', this.updateOrder);
    emitter.on('readyForPickupOfOrderDetail', this.readyForPickup);
  },
  unmounted() {
    emitter.off('updateOrder', this.updateOrder);
    emitter.off('readyForPickupOfOrderDetail', this.readyForPickup);
  },
  setup () {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      bagHandleOutline,
      bagRemoveOutline,
      hasPermission,
      router,
      store,
      timeOutline
    };
  }
});
</script>

<style scoped>
.border-top {
  border-top: 1px solid #ccc;
}

/* If not in desktop */
main {
  max-width: 445px;
  margin: var(--spacer-base) auto 0; 
}

aside {
  position: sticky;
  top: var(--spacer-lg);
}

.desktop-only {
  display: flex;
  justify-content: center;
  align-items: start;
  gap: var(--spacer-2xl);
  max-width: 990px;
  margin: var(--spacer-base) auto 0;
}

.desktop-only > * {
  width: calc(50% - var(--spacer-xl));
}
</style>
