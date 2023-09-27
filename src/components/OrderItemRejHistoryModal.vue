<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Order item rejection history") }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-list v-for="(item, index) in [1]" :key="index">
      <ion-item>
        <ion-thumbnail slot="start">
          <ShopifyImg :src="getProduct('10002').mainImageUrl" />
        </ion-thumbnail>
        <ion-label>
          <h5>{{ getProduct("10002").brandName }}</h5>
          <h2>{{ getProduct("10002").productName }}</h2>
          <p v-if="$filters.getFeature(getProduct('10002').featureHierarchy, '1/COLOR/')">{{ $t("Color") }}: {{ $filters.getFeature(getProduct("10002").featureHierarchy, '1/COLOR/') }}</p>
          <p v-if="$filters.getFeature(getProduct('10002').featureHierarchy, '1/SIZE/')">{{ $t("Size") }}: {{ $filters.getFeature(getProduct("10002").featureHierarchy, '1/SIZE/') }}</p>
        </ion-label>
        <ion-label slot="end" class="ion-text-right">
          <h2>{{ '<rejection reason></rejection>' }}</h2>
          <p>{{ $t('Rejected by', { userName: 'user-name', rejectionTime: 'rejection-time' }) }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <!-- Empty state -->
    <div v-if="!([1,3].length)" class="empty-state">
      <p>{{ $t('No records found.') }}</p>
    </div>
  </ion-content>
</template>
  
<script>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { mapGetters } from "vuex";

export default defineComponent({
  name: "OrderItemRejHistoryModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  setup() {
    return {
      closeOutline
    };
  },
});
</script>