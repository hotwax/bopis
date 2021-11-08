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

      
    </ion-header>
    
    <ion-content :fullscreen="true">
   
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { swapVerticalOutline } from 'ionicons/icons'

export default defineComponent({
  name: 'Orders',
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar
  },
  setup(){
    return {
      swapVerticalOutline,
    }
  }
});
</script>