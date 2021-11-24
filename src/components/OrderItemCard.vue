<template>
    <ion-card>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h1>Customer Name</h1>
                <p>Customer Id</p>
              </ion-label>
              <ion-note>
                <p>order time delta</p>
              </ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-thumbnail slot="start">
                <Image :src="'https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg'" />
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
            <ProductListItem />
            <ProductListItem />
            <ProductListItem />
            <ion-item lines="full">
              <ion-thumbnail slot="start">
                <Image :src="'https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg'" />
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>phone number</ion-label>
              <ion-button fill="outline" slot="end" color="medium">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>email</ion-label>
              <ion-button fill="outline" slot="end" color="medium">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
          </ion-list>
          <ion-button fill="clear">
            {{ $t("Ready For Pickup") }}
          </ion-button>
        </ion-card>
</template>


<script lang="ts">
import { IonCard , IonList , IonItem , IonLabel , IonNote , IonThumbnail , IonButton , IonIcon } from "@ionic/vue";
import Image from './Image.vue'
import ProductListItem from './ProductListItem.vue'
import { callOutline, mailOutline } from "ionicons/icons";
import { onMounted } from "vue"

export default {
    name: 'OrderItemCard',
    components: {
        IonCard,
        IonList,
        IonItem,
        IonLabel,
        IonNote,
        IonThumbnail,
        IonButton,
        IonIcon,
        Image,
        ProductListItem
    },
    props: ["order"],
    setup() {
        return {
            callOutline,
            mailOutline,
        }
    },
}
</script>