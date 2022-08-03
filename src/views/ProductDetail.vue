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
          <Image src="https://cdn.shopify.com/s/files/1/0419/6558/4548/products/mh08-brown_main.jpg?v=1632310706"/>
        </section>
        <section class="product-info">
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
            <p class="overline">Brand</p>
            <h1>Product name</h1>
            </ion-label>
            <ion-note slot="end">$Price</ion-note>
          </ion-item>  

          <ion-list>
            <ion-list-header>{{ $t("Color") }}</ion-list-header>
            <ion-item lines="none">
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Red</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Green</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Blue</ion-label>
              </ion-chip>  
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>{{ $t("Size") }}</ion-list-header>
            <ion-item lines="none">
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Small</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Medium</ion-label>
              </ion-chip> 
              <ion-chip outline>
                <ion-label class="ion-text-wrap">Large</ion-label>
              </ion-chip>  
            </ion-item>
          </ion-list>

          <ion-list>
            <ion-list-header>{{ $t("Inventory") }}</ion-list-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("In store") }}</ion-label>
              <ion-note slot="end">15 {{ $t("in stock") }}</ion-note>  
            </ion-item>
             <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Other stores") }}</ion-label>
              <ion-button fill="outline">15 {{ $t("in stock") }}</ion-button>
            </ion-item>
             <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ $t("Warehouse") }}</ion-label>
              <ion-note slot="end">{{ $t("in stock") }}</ion-note>  
            </ion-item>
          </ion-list>

          <ion-card>
            <ion-list>
              <ion-item-divider>
                <ion-label class="ion-text-wrap">{{ $t("Other stores") }}</ion-label>
              </ion-item-divider>  
              <ion-item>
                <ion-label class="ion-text-wrap">Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">Store name</ion-label>
                <ion-note slot="end">stock</ion-note>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">Store name</ion-label>
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
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import Image from "../components/Image.vue"

export default defineComponent({
  name: 'ProductDetail',
  components: {
    IonBackButton,
    IonButton,
    IonCard,
    IonChip,
    IonContent,
    IonHeader,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonPage,
    IonTitle,
    IonToolbar,
    Image
  }
});
</script>

<style scoped>
.product-image {
  text-align: center;
}  

.product-image > img {
  width: 200px;
}

@media (min-width: 720px) {
  main {
    display: grid;
    grid-template-columns: auto 500px;
    padding: var(--spacer-sm);
  }   

  .product-image > img {
    width: 400px;
  }
}
</style>