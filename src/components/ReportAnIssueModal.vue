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
      <p>{{ $t('On rejecting this item, <customer name> will be sent an email with alternate fulfillment options and this order item will be removed from your dashboard.') }}</p>
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
    
<script>
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
  data () {
    return {
      unfillableReason: JSON.parse(process.env.VUE_APP_UNFILLABLE_REASONS),
      rejectReasonId: ''
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    confirmSave () {
      console.log('save changes', this.rejectReasonId);
    }
  },
  setup() {
    return {
      closeOutline,
      saveOutline
    };
  }
});
</script>