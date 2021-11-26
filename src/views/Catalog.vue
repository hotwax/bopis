<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">  
        
      <ion-searchbar />                    
        <div class="product-item">  
          <ion-card>                     
            <Image :src="'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdHxlbnwwfHwwfHw%3D&w=1000&q=80'" />
            <ion-label>
              <h2>Brand</h2>
              <h2>Parent Name</h2>
              <p>{{ $n(100, 'currency') }}</p>                
            </ion-label>          
          </ion-card>                  
          <ion-card>          
            <Image :src="'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdHxlbnwwfHwwfHw%3D&w=1000&q=80'" />
            <ion-label>
              <h2>Brand</h2>
              <h2>Parent Name</h2>                
              <p>{{ $n(100, 'currency') }}</p>
            </ion-label>           
          </ion-card> 
        </div>                
    </ion-content> 
  </ion-page>
</template>

<script lang="ts">
import Image from "@/components/Image.vue";
import { IonCard, IonContent, IonHeader, IonLabel, IonPage, IonSearchbar, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Catalog',
  components: {
    Image,
    IonCard,   
    IonContent, 
    IonHeader,
    IonLabel, 
    IonPage, 
    IonSearchbar, 
    IonTitle, 
    IonToolbar
    
  }
}
);
</script>
<style scoped>
 .product-item {
   display: grid;
   grid-template-columns: repeat( auto-fill, minmax(150px, 1fr) );
 }
</style>