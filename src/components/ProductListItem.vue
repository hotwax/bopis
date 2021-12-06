<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="item.images.main.thumbnail" />
    </ion-thumbnail>
    <ion-label>
      <h5>{{  item.itemId }}</h5>
      <h2>{{ item.itemName }}</h2>
      <p>{{ $t("Color") }} : {{ item.standardFeatures.COLOR.description }}</p>
      <p>{{ $t("Size") }} : {{ item.standardFeatures.SIZE.description }}</p>
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
  props: ["item"]
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}
</style>