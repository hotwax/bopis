<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Inventory computation")}}</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Quantity on hands")}}</ion-label>
        <ion-note slot="end">52</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
        <ion-note slot="end">4</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
        <ion-note slot="end">1</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">{{ translate("Online ATP")}}</ion-label>
        <ion-badge slot="end" color="success">52</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar
} from '@ionic/vue'

import { defineComponent } from 'vue';
import { useStore } from 'vuex';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'InventoryDetailsPopover',
  component:{
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar
  },
  props: {
  },
  data () {
      return {

      }
  },
  computed: {
      
  },
  methods: {

  },
  setup () {
    const store = useStore();
    return {
    store,
    translate
  };


  }
})
</script>