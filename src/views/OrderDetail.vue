<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-back-button default-href="home"></ion-back-button>
      </ion-buttons>
      <ion-title>{{$t("Order details")}}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label>
          <h2>{{$t("Customer name")}}</h2>

          <!-- <p slot="end"> order time delta</p> -->
          <p>Order ID</p>
        </ion-label>
        <ion-note slot="end">{{$t("order time delta")}}</ion-note>
      </ion-item>
    </ion-list>
    <!-- The Phone Number SLot -->
    <ion-item>
      <ion-icon :icon="callOutline" slot="start"></ion-icon>
      <ion-label>{{ $t("Phone Number") }}</ion-label>
      <ion-button fill="outline" slot="end" color="medium">{{
        $t("Copy")
      }}</ion-button>
    </ion-item>

    <!-- The Email Slot -->
    <ion-item lines="none">
      <ion-icon :icon="mailOutline" slot="start"></ion-icon>
      <ion-label>{{ $t("Email") }}</ion-label>
      <ion-button fill="outline" slot="end" color="medium">{{
        $t("Copy")
      }}</ion-button>
    </ion-item>
       <!-- Card -->
       <ion-card>
          <ion-card-content class="border-bottom">
            
              <ion-item lines="full">
                <ion-thumbnail slot="start">
                  <img
                    src="../assets/images/image1.jpeg"
                    alt=""
                  />
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>

                </ion-label>
                <ion-note slot="end" color="warning">15 {{ $t("In Stock") }}</ion-note>

              </ion-item>
             <ion-item lines="none">
                <ion-checkbox  slot="start"  color="primary">
              </ion-checkbox>
              <ion-label>{{ $t("UnFillable") }} </ion-label>
             
              <ion-select value="Not in stock">
                <ion-select-option>Not in stock</ion-select-option>
              </ion-select>
             </ion-item>
               </ion-card-content>
          </ion-card>
         
            <!-- <p>This order cannot be split. If you cannot fulfill any item, customer name will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.</p> -->
            <ion-text>
         <p>{{$t("This order cannot be split. If you cannot fulfill any item, <customer name> will be sent an email with alternate fulfillment options and this order will be removed from your dashboard.")}}</p>

            </ion-text>
            <ion-button expand="block" color="danger" fill="outline" >{{$t("REJECT ORDER")}}</ion-button>
               <ion-badge>
                 
               <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
              <ion-label>
               {{$t(" Learn more about unfillable items")}}
              </ion-label>
            </ion-badge>
        


  </ion-content>
</template>

<script>
import {
  IonHeader,
  IonToolbar,
  IonList,
  IonItem,
  IonContent,
  IonNote,
  IonLabel,
  IonBackButton,
  IonButtons,
  IonTitle,
  IonSelect,
  IonCheckbox,
  IonButton,
  IonCardContent,
  IonThumbnail,
  IonSelectOption,
  IonIcon,IonText,IonCard,
} from "@ionic/vue";
import { defineComponent } from "vue";
import {
  swapVerticalOutline,
  callOutline,
  mailOutline,
  informationCircleOutline,
} from "ionicons/icons";

export default defineComponent({
  name: "OrderDetail",
  components: {
    IonHeader,IonText,IonCard,
    IonSelect,
    IonCheckbox,
    IonButton,
    IonCardContent,
    IonThumbnail,
    IonSelectOption,
    IonIcon,
    IonToolbar,
    IonList,
    IonItem,
    IonContent,
    IonNote,
    IonLabel,
    IonBackButton,
    IonButtons,
    IonTitle,
  },
  setup() {
    return {
      swapVerticalOutline,
      callOutline,
      mailOutline,
      informationCircleOutline,
    };
  },
});
</script>
<style scoped>
ion-thumbnail > img {
  object-fit: contain;
}
ion-select {
  max-width: 100%;
}
/* ion-text{
width: 50%;
} */
</style>
