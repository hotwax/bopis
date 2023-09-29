<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Report an issue") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-item lines="none">
      <p>{{ $t('On rejecting this item, will be sent an email with alternate fulfillment options and this order item will be removed from your dashboard.', { customerName: order.customer?.name }) }}</p>
    </ion-item>
    <ion-list>
      <ion-list-header>{{ $t("Select reason") }}</ion-list-header>
      <ion-radio-group v-model="rejectReasonId">
        <ion-item v-for="reason in unfillableReason" :key="reason.id">
          <ion-radio slot="start" :value="reason.id"/>
          <ion-label>{{ $t(reason.label) }}</ion-label>
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
  modalController,
  IonRadio,
  IonRadioGroup
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex'

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
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
      rejectReasonId: ''
    }
  },
  computed: {
    ...mapGetters({
      order: "order/getCurrent"
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    confirmSave () {
      console.log('this.getCurrentOrderPartWithSelectedItem() -- ', this.getCurrentOrderPartWithSelectedItem());
      
      // this.store.dispatch('order/setUnfillableOrderOrItem', { orderId: this.order.orderId, part: this.getCurrentOrderPartWithSelectedItem() }).then((resp) => {
      //   console.log('');
        
      // })
    },
    getCurrentOrderPartWithSelectedItem() {
      const part = this.order.parts?.find((part: any) => part.orderPartSeqId === this.$route.params.orderPartSeqId);
      if (part) {
        part.items = [Object.assign(this.item, { reason: this.rejectReasonId })];
        return part;
      }
      return {};
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      saveOutline,
      store
    };
  }
});
</script>