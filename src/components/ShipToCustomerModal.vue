<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" slot="icon-only" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Ship to customer") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <main>  
      <ion-item>
        <ion-label position="fixed">{{ $t("First name") }}</ion-label>
        <ion-input v-model="firstName" />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("Last name") }}</ion-label>
        <ion-input v-model="lastName" />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("Street") }}</ion-label>
        <ion-input v-model="street" />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("City") }}</ion-label>
        <ion-input v-model="city" />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("State") }}</ion-label>
        <ion-input v-model="state" />
      </ion-item>
      <ion-item>
        <ion-label position="fixed">{{ $t("Zipcode") }}</ion-label>
        <ion-input v-model="zipcode" />
      </ion-item>
      <ion-item>
        <ion-label>{{ $t("Shipping method") }}</ion-label>
        <ion-select :value="shipmentMethod" :selected-text="getShipmentMethod(shipmentMethod)" @ionChange="changeShipment($event)">
          <ion-select-option v-for="shipMethod in shipmentMethods" :key="shipMethod" :value="shipMethod.shipmentMethodTypeId">{{ shipMethod.description }}</ion-select-option>
        </ion-select>
      </ion-item>

      <div class="ion-padding ion-text-center">
        <ion-button @click="shipToCustomer" size="small">{{ $t("Ship to this address") }}</ion-button>
      </div>
    </main>
  </ion-content> 
</template>

<script lang="ts">
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
import { mapGetters, useStore } from "vuex"


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
  data() {
    return{
      firstName: this.order.firstName,
      lastName: this.order.lastName,
      street: this.order.address1,
      city: this.order.city,
      state: this.order.stateProvinceGeoId,
      zipcode: this.order.postalCode,
      shipmentMethod: this.order.shipmentMethod
    }
  },
  props: ['order'],
  computed: {
    ...mapGetters({
      shipmentMethods: "util/getShipmentMethods",
      getShipmentMethod: "util/getShipmentMethod"
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async shipToCustomer() {
      const alert = await alertController
        .create({
          header: this.$t('Ship to customer'),
          message: this.$t('This order will be rejected from this store with the selected reason and shipped to the address that has been inputed.Please make sure the address you have entered is correct.', {space: '<br /><br />'}),
          buttons: [
            {
              text: this.$t('Cancel')
            },
            {
              text: this.$t('Ship'),
              handler: () => {
                const payload = {
                  "partyId": this.order.customerId,
                  "orderId": this.order.orderId,
                  "shipGroupSeqId": this.order.shipGroupSeqId,
                  "isEdited": "Y",
                  "shipmentMethod": this.shipmentMethod,
                  "toName": this.firstName + " " + this.lastName,
                  "address1": this.street,
                  "stateProvinceGeoId": this.state,
                  "city": this.city,
                  "postalCode": this.zipcode
                }

                this.store.dispatch('order/UpdateOrderAddress', payload)
                  .then(() => modalController.dismiss({ dismissed: true }));
              }
            }
          ],
        });
      return alert.present();
    },
    changeShipment(event: CustomEvent) {
      this.shipmentMethod = event['detail'].value;
    }
  },
  beforeCreate() {
    this.store.dispatch("util/fetchShipmentMethods");
  },
  setup() {
    const store = useStore();

    return {
      businessOutline,
      closeOutline,
      store,
      storefrontOutline
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