<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Catalog") }}</ion-title>
      </ion-toolbar>
    </ion-header>   
    <ion-content :fullscreen="true">
      <ion-searchbar/>
      <main>        
        <ion-card v-for="items in 10" :key="items">
          <Image/>
            <ion-item lines="none">
              <ion-label>
                <p>Brand</p>
                  Parent name
                <p>$Sale price</p>
              </ion-label>
            </ion-item>          
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonCard,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import Image from "../components/Image.vue"

export default defineComponent({
  name: 'Catalog',
  components: {
    Image,
    IonCard,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonPage,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  }
});
</script>
<style scoped>
main{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    align-items: start;
    
}

</style>
