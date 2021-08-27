<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search orders"></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment @ionChange="segmentChanged($event)" v-model="segment">
          <ion-segment-button value="orders">
            <ion-label>OPEN</ion-label></ion-segment-button
          >
          <ion-segment-button value="packedorders">
            <ion-label>PACKED</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
   
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonLabel, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'Orders',
  components: {
    IonContent,
    IonHeader,
    IonLabel,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar
  },
  methods: {
    segmentChanged(ev: CustomEvent) {
      this.segment = ev.detail.value;
    },
  },
  setup() {
    const segment = ref("orders");
    return {
      segment
    };
  }
});
</script>