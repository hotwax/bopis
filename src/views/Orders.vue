<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search orders"></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment @ionChange="segmentChanged($event)" v-model="segment">
          <ion-segment-button value="open">
            <ion-label>{{ $t("OPEN") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packedorders">
            <ion-label>{{ $t("PACKED") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <div v-if="segment == 'open'">
        <ion-card>
          <ion-item lines="none" >
            <ion-label>
              <h1>Customer name</h1>
              <p>Order ID</p>
            </ion-label>
            <ion-note slot="end">order time delta</ion-note>
          </ion-item>
          <ion-item lines="full">
            <ion-thumbnail slot="start">
              <img class="thumbnail-image" src="https://images-na.ssl-images-amazon.com/images/I/61cyHHh-l7L._UL1100_.jpg"/>
            </ion-thumbnail>
            <ion-label>
              <h2>BRAND</h2>
              <h1>Virtual name</h1>
              <p>Color: color</p>
              <p>Size: size</p>
            </ion-label>
            <ion-note color="success" slot="end">15 in stock</ion-note>
          </ion-item>
          <ion-list>
            <ion-item >
              <ion-icon slot="start" :icon="callOutline" />
              <ion-label>phone number</ion-label>
              <ion-button fill="outline" color="medium">COPY</ion-button>
            </ion-item>
            <ion-item lines="full">
              <ion-icon slot="start" :icon="mailOutline" />
              <ion-label>email</ion-label>
              <ion-button fill="outline" color="medium">COPY</ion-button>
            </ion-item>
          </ion-list>
          <ion-button fill="clear">{{ $t("READY FOR PICKUP") }}</ion-button>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { callOutline, mailOutline, swapVerticalOutline } from 'ionicons/icons'
import { IonButton, IonButtons, IonCard, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonThumbnail, IonTitle, IonToolbar } from '@ionic/vue';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonButtons, 
    IonCard,
    IonContent,
    IonHeader,
    IonIcon, 
    IonItem,
    IonLabel,
    IonList, 
    IonNote,
    IonPage,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonThumbnail,
    IonTitle,
    IonToolbar
  },
  methods: {
    segmentChanged(ev: CustomEvent) {
      this.segment = ev.detail.value;
    },
  },
  setup() {
    const segment = ref("orders");
    return {
      callOutline,
      mailOutline,
      segment,
      swapVerticalOutline
    };
  }
});
</script>