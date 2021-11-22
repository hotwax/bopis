<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">    
      <ion-searchbar></ion-searchbar>
      <ion-row>
        <ion-col>
          <ion-card>
            <ion-card-header>
              <ion-thumbnail>
              <img src="" />
              </ion-thumbnail> 
            </ion-card-header>
           
            <ion-label>
              <h2 class="black-text" style="color: black;">Brand</h2>
              <h2 class="black-text" style="color: black;">Parent Name</h2>
              <p>$Sale price</p>
            </ion-label>
          </ion-card>  
        </ion-col>
        <ion-col> 
          <ion-card>
            <ion-card-header>
              <ion-thumbnail>
              <img src="" />
              </ion-thumbnail>
            </ion-card-header>
           
            <ion-label>
              <h2 class="black-text" style="color: black;">Brand</h2>
              <h2 class="black-text" style="color: black;">Parent Name</h2>
              <p>$Sale price</p>
            </ion-label>
          </ion-card>  
        </ion-col>    
        </ion-row>      
    </ion-content>
   
    
  </ion-page>
</template>

<script lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Catalog',
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar
  }
});
</script>
