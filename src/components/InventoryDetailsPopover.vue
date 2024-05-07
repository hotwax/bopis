<template>
  <ion-content>
    <ion-list>
      <ion-list-header>Inventory computation</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">Quantity on hands</ion-label>
        <ion-note slot="end">52</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">Safety stock</ion-label>
        <ion-note slot="end">4</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">Qrder reservation</ion-label>
        <ion-note slot="end">1</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">Online ATP</ion-label>
        <ion-badge slot="end" color="success">52</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonList,
} from '@ionic/vue'

import { defineComponent } from 'vue';
import { useStore } from 'vuex'

  export default defineComponent({
    name: 'InventoryDetailsPopover',
    component:{
      IonHeader,
      IonToolbar,
      IonButtons,
      IonTitle,
      IonContent,
      IonItem,
      IonLabel,
      IonNote,
      IonBadge,
      IonList,
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
      store
    };


    }
  })
</script>