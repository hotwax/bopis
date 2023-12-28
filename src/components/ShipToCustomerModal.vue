<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Ship to customer") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <main>  
      <ion-item>
        <ion-label position="fixed">{{ translate("First name") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ translate("Last name") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ translate("Street") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ translate("City") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ translate("State") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ translate("Zipcode") }}</ion-label>
        <ion-input />
      </ion-item>
      <ion-item>
        <ion-select :label="translate('Shipping method')" value="next-day">
          <ion-select-option value="same-day">Same day</ion-select-option>
          <ion-select-option value="next-day">Next day</ion-select-option>
          <ion-select-option value="second-day">After 2 days</ion-select-option>
        </ion-select>
      </ion-item>

      <div class="ion-padding ion-text-center">
        <ion-button @click="shipToCustomer" size="small">{{ translate("Ship to this address") }}</ion-button>
      </div>
    </main>
  </ion-content> 
</template>

<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController,
  alertController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import {
  businessOutline,
  closeOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { translate } from "@hotwax/dxp-components";

export default defineComponent({
  name: 'ShipToCustomerModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async shipToCustomer() {
      const alert = await alertController
        .create({
          header: translate('Ship to customer'),
          message: translate('This order will be rejected from this store with the selected reason and shipped to the address that has been inputed.Please make sure the address you have entered is correct.', {space: '<br /><br />'}),
          buttons: [translate('Cancel'), translate('Ship')],
        });
      return alert.present();
    },
  },
  setup() {
    return {
      businessOutline,
      closeOutline,
      storefrontOutline,
      translate
    };
  },
});
</script>

<style scoped>
main {
 max-width: 75%;
 margin: auto;
}
</style>