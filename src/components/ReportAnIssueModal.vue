<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Report an issue") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-item lines="none">
      <p>{{ translate('On rejecting this item, will be sent an email with alternate fulfillment options and this order item will be removed from your dashboard.', { customerName: order?.customer?.name }) }}</p>
    </ion-item>
    <ion-list>
      <ion-list-header>{{ translate("Select reason") }}</ion-list-header>
      <ion-radio-group v-model="rejectReasonId">
        <ion-item v-for="reason in unfillableReasons" :key="reason.id">
          <ion-radio slot="start" :value="reason.id"/>
          <ion-label>{{ translate(reason.label) }}</ion-label>
        </ion-item>
      </ion-radio-group>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="!rejectReasonId" @click="confirmSave()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>
    
<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
  IonRadio,
  IonRadioGroup,
  alertController,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex'
import { OrderService } from "@/services/OrderService";
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReportAnIssueModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonToolbar,
    IonRadio,
    IonRadioGroup
  },
  props: ['item'],
  data () {
    return {
      unfillableReasons: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
      rejectReasonId: ''
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent",
      getProduct: 'product/getProduct',
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async confirmSave () {
      const alert = await alertController
        .create({
          header: translate('Reject Order Item'),
          // TODO: Show primary identifier in message instead of productName when product identifier functionality implemented in the app.
          message: translate('will be removed from your dashboard. This action cannot be undone.', { productName: this.getProduct(this.item.productId)?.productName, space: '<br /><br />' }),
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          }, {
            text: translate('Reject'),
            handler: () => {
              OrderService.rejectItem({ orderId: this.order.orderId, shipmentMethodEnumId: this.order.part.shipmentMethodEnum.shipmentMethodEnumId, item: { ...this.item, reason: this.rejectReasonId } }).then((resp) => {
                if (resp) {
                  // creating an current order copy by removing the selected item from the order.part
                  const order = { ...this.order, part: { ...this.order.part, items: this.order.part.items.filter((item: any) => !(item.orderItemSeqId === this.item.orderItemSeqId && item.productId === this.item.productId)) } };

                  // If this is the last item of the order then the order is fully rejected
                  if (this.order.part.items.length === 1) order.rejected = true;

                  this.store.dispatch('order/updateCurrent', { order });
                }
                this.closeModal();
              })
            },
          }]
        });
      return alert.present();
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      saveOutline,
      store,
      translate
    };
  }
});
</script>