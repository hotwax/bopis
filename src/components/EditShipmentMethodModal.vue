<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Select shipping method") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list>
      <ion-item lines="none">
        <ion-label>{{ translate('Select which shipping method orders will receive when customer choose to have delivered instead of picked up.') }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-select :label="translate('Carrier')" v-model="carrierPartyId" interface="popover" @ionChange="getProductStoreShipmentMethods(carrierPartyId)" :placeholder="translate('carrier')">
          <ion-select-option v-for="carrier in carriers" :key="carrier.partyId" :value="carrier.partyId">{{ carrier.groupName }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <template v-if="productStoreShipmentMethods && productStoreShipmentMethods.length > 0">
          <ion-select :label="translate('Method')" v-model="shipmentMethodTypeId" interface="popover">
            <ion-select-option v-for="method in productStoreShipmentMethods" :key="method.productStoreShipMethId" :value="method.shipmentMethodTypeId">{{ method.description }}</ion-select-option>
          </ion-select>
        </template>
        <template v-else>
          <ion-label v-if="carrierPartyId">
            {{ translate('No shipment methods linked to', {carrierName: getCarrierName(carrierPartyId)}) }}
          </ion-label>
          <ion-label v-else>
            {{ translate("Select a carrier to see the linked shipment methods") }}
          </ion-label>
          <ion-button size="default" v-if="carrierPartyId" @click="openShippingMethodDocumentReference()" fill="clear" color="medium" slot="end">
            <ion-icon slot="icon-only" :icon="informationCircleOutline" />
          </ion-button>
        </template>
      </ion-item>
    </ion-list>
  </ion-content>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="!shipmentMethodTypeId" @click="save()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>
  
<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar, modalController } from '@ionic/vue';
import { onMounted, ref } from 'vue';
import { closeOutline, informationCircleOutline, saveOutline } from 'ionicons/icons';
import { translate } from '@common';

const props = defineProps(['currentcConfig', 'carriers', 'availableShipmentMethods'])

const carrierPartyId = ref("")
const shipmentMethodTypeId = ref("")
const productStoreShipmentMethods = ref([] as any)

onMounted(() => {
  carrierPartyId.value = props.currentcConfig.carrierPartyId
  getProductStoreShipmentMethods(carrierPartyId.value)
  shipmentMethodTypeId.value = props.currentcConfig.shipmentMethodTypeId
})

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

async function getProductStoreShipmentMethods(carrierId: string) { 
  productStoreShipmentMethods.value = props.availableShipmentMethods?.filter((method: any) => method.partyId === carrierId) || [];
  shipmentMethodTypeId.value = productStoreShipmentMethods.value[0]?.shipmentMethodTypeId;
}

function getCarrierName(carrierId: string) {
  const selectedCarrier = props.carriers.find((carrier: any) => carrier.partyId === carrierId)
  return selectedCarrier && selectedCarrier.groupName ? selectedCarrier.groupName : carrierId
}

function openShippingMethodDocumentReference() {
  window.open('https://docs.hotwax.co/documents/v/system-admins/fulfillment/shipping-methods/carrier-and-shipment-methods', '_blank');
}

function save() {
  modalController.dismiss({ dismissed: true, shippingMethod: {"carrierPartyId": carrierPartyId.value, "shipmentMethodTypeId": shipmentMethodTypeId.value}});
}

</script>