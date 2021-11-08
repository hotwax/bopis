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
        
      <ion-card>

        <!-- This the the header of the card -->
        <ion-card-header>
            <ion-card-title>Customer Name</ion-card-title>
            <ion-card-subtitle>Customer Id</ion-card-subtitle>
            <!-- <ion-not color="medium" slot="">order time delta</ion-not> -->
        </ion-card-header>
       

        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-thumbnail slot="start">
                <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg" alt="" />
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>Color : color</p>
                <p>Size : size</p>
              </ion-label>
              <ion-not color="medium">15 in stocks</ion-not>
            </ion-item>
          </ion-list>
        </ion-card-content>
          
        <ion-item>
          <ion-icon :icon="callOutline" slot="start"></ion-icon>
          <ion-label>Phone Number</ion-label>
          <ion-button fill="outline" slot="end" color="medium">COPY</ion-button>
        </ion-item>

        <ion-item>
          <ion-icon :icon="mailOutline" slot="start"></ion-icon>
          <ion-label>Email</ion-label>
          <ion-button fill="outline" slot="end" color="medium">COPY</ion-button>
        </ion-item>

        <ion-item>
          <ion-button fill="clear" size="default" slot="start">READY FOR PICKUP</ion-button>
        </ion-item>
      </ion-card>

      </div>

      <!-- if employer is on the packed segment -->
      <div v-if="segmentName=='packed'">
        In this the packed segments will be shown
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonCard, IonCardContent, IonLabel, IonButton, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonSearchbar, IonItem} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { swapVerticalOutline, callOutline , mailOutline} from 'ionicons/icons'

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
    IonSearchbar,
    IonCard,
    IonItem,
    IonLabel,
    IonButton,
    // IonCardContent
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
      segmentName,
      callOutline,
      mailOutline
    }
  }
});
</script>

<style scoped>
ion-searchbar{
  box-shadow: lightgreen;
}

ion-not{
  color: #2DD36F;
  font-size: small;
}

h5{
  font-size: x-small;
}

ion-card-header{
  padding-bottom: 0px;
}
</style>