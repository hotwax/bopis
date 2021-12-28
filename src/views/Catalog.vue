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
        <ion-card v-for="items in products" :key="items">
          <Image :src="items.mainImageUrl"/>
            <ion-item lines="none">
              {{items.p}}
              <ion-label>
                <p>{{items.productId}}</p>
                 {{items.productName}}
                <p>${{items.groupPrice}}</p>
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
import { mapGetters,useStore } from 'vuex';
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
  },
  computed : {
    ...mapGetters({
      products:'product/findProducts'
    })

  },
 
  async mounted () {
    // this.getOrders(process.env.VUE_APP_VIEW_SIZE,0);
    console.log('products',this.products)
    await this.store.dispatch("product/findProducts");
    
  }, setup(){
      const store = useStore();

    return{
      store
    }
  },
});
</script>
<style scoped>
main{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    align-items: start;
    
}

</style>
