<template>
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
</template>


<script lang="ts">
import { IonItem , IonThumbnail , IonLabel , IonNote } from "@ionic/vue";
import Image from './Image.vue'
export default {
    components: {
        IonItem,
        IonLabel,
        IonNote,
        IonThumbnail,
        Image
    },
    // setup() {
        
    // },
}
</script>