<template>
  <ion-item lines="none">
    <ion-thumbnail slot="start">
      <Image :src="item.images.main.thumbnail" />
    </ion-thumbnail>
    <ion-label>
      <h5>{{ item?.brandName }}</h5>
      <h2>{{ item.itemName }}</h2>
      <p>{{ $t("Color") }} : {{ item.standardFeatures.COLOR.description }}</p>
      <p>{{ $t("Size") }} : {{ item.standardFeatures.SIZE.description }}</p>
    </ion-label>
    <ion-note slot = "end">{{ getProductStock(item.itemId) }} {{ $t("in stock") }}</ion-note>
  </ion-item>
</template>

<script lang="ts">
import { IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/vue";
import Image from './Image.vue'
import { mapGetters } from 'vuex';

export default {
  components: {
    Image,
    IonItem,
    IonLabel,
    IonNote,
    IonThumbnail
  },
  props: ["item"],
  computed: {
    ...mapGetters({
      getProductStock: 'stock/getProductStock'
    })
  }
}
</script>

<style>
ion-thumbnail > img {
  object-fit: contain;
}
</style>
