<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t("Ship to customer") }}</ion-title>
      <ion-buttons slot="end" @click="closeShipmentModal()" >
        <ion-button >
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>  
    </ion-toolbar>   
  </ion-header> 
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label position="floating">{{ $t("First name") }}</ion-label>
        <ion-input v-model="firstName" /> 
      </ion-item> 
      <ion-item>
        <ion-label position="floating">{{ $t("Last name") }}</ion-label>
        <ion-input v-model="lastName" /> 
      </ion-item>     
      <ion-item>
        <ion-label position="floating">{{ $t("Street") }}</ion-label>
        <ion-input v-model="street" /> 
      </ion-item>     
      <ion-item>
        <ion-label position="floating">{{ $t("City") }}</ion-label>
        <ion-input v-model="city" /> 
      </ion-item>
      <ion-item>
        <ion-label position="floating">{{ $t("State") }}</ion-label>
        <ion-input v-model="state" /> 
      </ion-item>
      <ion-item>
        <ion-label position="floating">{{ $t("Zipcode") }}</ion-label>
        <ion-input v-model="zipcode" /> 
      </ion-item>
      <ion-item>
        <ion-label position="floating">{{ $t("Shipping method") }}</ion-label>
        <ion-select>
          <ion-select-option>Next day</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
    <ion-button @click="UpdateOrderAddress()">{{ $t("Ship to this address") }}</ion-button>
 </ion-content>
</template>

<script lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonInput,IonLabel, IonList, IonSelect, IonSelectOption, IonTitle,  IonToolbar,modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { 
  closeOutline
} from 'ionicons/icons';
import { useStore } from "vuex";
import { useRouter } from "vue-router";

export default defineComponent({
  name: 'ShipmentModal',  
  components: { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonInput,IonLabel, IonList, IonSelect, IonSelectOption, IonTitle,  IonToolbar},
  data() {
    return{
      firstName: "",
      lastName: "",
      street: "",
      city: "",
      state: "",
      zipcode: ""
    }
  },
  methods:{
    closeShipmentModal(){
      modalController.dismiss({dismissed:true});
    },
    async UpdateOrderAddress() {
      const payload = {
        "toName": this.firstName + ' ' + this.lastName,
        "address1": this.street,
        "address2": this.state,
        "city": this.city,
        "postalCode": this.zipcode,
      }

      this.store.dispatch('order/UpdateOrderAddress', payload);
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      closeOutline,
      store
    }
  }
});
</script>