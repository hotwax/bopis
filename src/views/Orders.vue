<template>
  <ion-page>
    <!-- Designing the Header -->

    <ion-header :translucent="true">
      <!-- First Line view -->
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Search bar view -->
      <ion-toolbar>
        <ion-searchbar placeholder="Search Item"></ion-searchbar>
      </ion-toolbar>

      <!-- Segment part where we can switch between open and packed orders -->
      <ion-segment @ionChange="segmentChanged($event)" v-model="segmentName">
        <ion-segment-button value="open">
          <ion-label>{{ $t("OPEN") }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="packed">
          <ion-label>{{ $t("PACKED") }}</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <!-- Content of the app -->
    <ion-content :fullscreen="true">
      <!-- if employer is on the open segment -->
      <div v-if="segmentName == 'open'">
        <ion-card>
          <!-- This the the header of the card -->
          <ion-card-header>
            <ion-item lines="none">
              <ion-label>
                <h2>Customer Name</h2>
                <p>Customer Id</p>
              </ion-label>
              <ion-note slot="end">Vico Turmeric</ion-note>
            </ion-item>
          </ion-card-header>

          <!-- The content of the card -->
          <ion-card-content class="border-bottom">
            <ion-list>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <img
                    src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"
                    alt=""
                  />
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-not color="medium">15 {{ $t("In Stock") }}</ion-not>
              </ion-item>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <img
                    src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"
                    alt=""
                  />
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-not color="medium">15 {{ $t("In Stock") }}</ion-not>
              </ion-item>
            </ion-list>
          </ion-card-content>

          <!-- The Phone Number SLot -->
          <ion-item>
            <ion-icon :icon="callOutline" slot="start"></ion-icon>
            <ion-label>{{ $t("Phone Number") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">{{ $t("Copy") }}</ion-button>
          </ion-item>

          <!-- The Email Slot -->
          <ion-item lines="none">
            <ion-icon :icon="mailOutline" slot="start"></ion-icon>
            <ion-label>{{ $t("Email") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">{{ $t("Copy") }}</ion-button>
          </ion-item>

          <!-- The Footer Slot -->
          <div class="border-top">
            <ion-button fill="clear" size="default" slot="start">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>

        </ion-card>
      </div>

      <!-- if employer is on the packed segment -->
      <div v-if="segmentName == 'packed'">
        In this the packed segments will be shown
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonCard,
  IonNote,
  IonCardContent,
  IonLabel,
  IonButton,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonItem,
  IonIcon,
  IonButtons,
  IonCardHeader,
  IonThumbnail,
  IonList

} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import { swapVerticalOutline, callOutline, mailOutline } from "ionicons/icons";

export default defineComponent({
  name: "Orders",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonSegmentButton,
    IonSegment,
    IonSearchbar,
    IonCard,
    IonItem,
    IonLabel,
    IonButton,
    IonCardContent,
    IonNote,
    IonIcon,
    IonButtons,
    IonCardHeader,
    IonThumbnail,
    IonList
  },
  methods: {
    segmentChanged(ev: CustomEvent) {
      console.log("Segment changed", ev);
    },
  },
  setup() {
    const segmentName = ref("open");
    return {
      swapVerticalOutline,
      segmentName,
      callOutline,
      mailOutline,
    };
  },
});
</script>

<style scoped>
ion-searchbar {
  box-shadow: lightgreen;
}
ion-not {
  color: #2dd36f;
  font-size: small;
}

h5 {
  font-size: x-small;
}

ion-card-header {
  padding-bottom: 0px;
}

.border-top {
  border-top: 1px solid rgb(211, 205, 205);
}

.border-bottom {
  border-bottom: 1px solid rgb(211, 205, 205);
}

ion-card-subtitle {
  display: block;
}

ion-note {
  padding-top: 20px;
}
</style>