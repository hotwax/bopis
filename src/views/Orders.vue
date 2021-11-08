<template>
  <ion-page>

    <!-- Designing the Header -->

    <ion-header :translucent="true">

      <!-- First Line view -->
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
              <ion-icon :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Search bar view -->
      <ion-toolbar>
        <ion-searchbar  placeholder="Search Item"></ion-searchbar>
      </ion-toolbar>

      <!-- Segment part where we can switch between open and packed orders -->
      <ion-segment @ionChange="segmentChanged($event)" v-model="segmentName"> 
        <ion-segment-button value="open">
          <ion-label>OPEN</ion-label>
        </ion-segment-button>
        <ion-segment-button value="packed">
          <ion-label>PACKED</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    

    <!-- Content of the app -->
    <ion-content :fullscreen="true">
   
      <!-- if employer is on the open segment -->
      <div v-if="segmentName=='open'">
        In this the open products will be shown
      </div>

      <!-- if employer is on the packed segment -->
      <div v-if="segmentName=='packed'">
        In this the packed segments will be shown
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonSearchbar} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { swapVerticalOutline } from 'ionicons/icons'

export default defineComponent({
  name: 'Orders',
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonSegmentButton,
    IonSegment,
    IonSearchbar
  },
  methods: {
    segmentChanged(ev: CustomEvent) {
      console.log('Segment changed', ev);
    }
  },
  setup(){
    const segmentName = ref("open")
    return {
      swapVerticalOutline,
      segmentName
    }
  }
});
</script>

<style scoped>
ion-searchbar{
  box-shadow: lightgreen;
}
</style>