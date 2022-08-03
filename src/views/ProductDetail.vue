<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" defaultHref="/" />
        <ion-title>{{ $t("Product details") }}</ion-title>
      </ion-toolbar>
    </ion-header>   
    <ion-content>
      <main>
        <section class="product-image">
          <Image/>  
        </section>
        <section class="product-info">
          <ion-item lines="none">
            <ion-label>
            <p class="overline">Brand</p>
            <h1>Product name</h1>
            </ion-label>
            <ion-note slot="end">$Price</ion-note>
          </ion-item>  

          <ion-list>
            <ion-list-header>Colors</ion-list-header>
            <ion-item lines="none">
              <ion-chip outline>
                <ion-label>Red</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label>Green</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label>Blue</ion-label>
              </ion-chip>  
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>Size</ion-list-header>
            <ion-item lines="none">
              <ion-chip outline>
                <ion-label>Small</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label>Medium</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label>Large</ion-label>
              </ion-chip>  
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>Inventory</ion-list-header>
            <ion-item>
              <ion-label>In store</ion-label>
              <ion-note slot="end">15 in stock</ion-note>  
            </ion-item>
             <ion-item>
              <ion-label>Other stores</ion-label>
              <ion-chip slot="end">
                <ion-label>15 in stock</ion-label>
              </ion-chip>  
            </ion-item>
             <ion-item lines="none">
              <ion-label>Warehouse</ion-label>
              <ion-note slot="end">In stock</ion-note>  
            </ion-item>
          </ion-list>

          <ion-card>
            <ion-list>
              <ion-item-divider>
                <ion-label>Other stores</ion-label>
              </ion-item-divider>  
              <ion-item>
                <ion-label>Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item>
                <ion-label>Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
            </ion-list>
          </ion-card>
        </section>
      </main>  
      
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { 
  IonBackButton,
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
  name: 'ProductDetail',
  components: {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    Image
  }
});
</script>

<style scoped>
.product-image {
    width: 100px;
}
@media (min-width: 991px) {
  .product-image {
    width: 366px;
    height: 521px;
  }  
  main {
    display: flex;  
    justify-content: space-between;
  } 
  .product-info {
    flex: 0 1 400px;
  }
}
</style>