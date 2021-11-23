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
                <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdHxlbnwwfHwwfHw%3D&w=1000&q=80" />
                <ion-label>
                  <h2 class="black-text" style="color: black;">Brand</h2>
                  <h2 class="black-text" style="color: black;">Parent Name</h2>
                  <p>$Sale price</p>
                </ion-label>
              </ion-card-header>             
          </ion-card>  
        </ion-col>
        <ion-col> 
          <ion-card>
              <ion-card-header>
                <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdHxlbnwwfHwwfHw%3D&w=1000&q=80" />
                <ion-label>
                  <h2 class="black-text" style="color: black;">Brand</h2>
                  <h2 class="black-text" style="color: black;">Parent Name</h2>
                  <p>$Sale price</p>
                </ion-label>
              </ion-card-header>            
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
