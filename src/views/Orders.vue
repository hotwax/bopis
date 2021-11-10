<template>
  <ion-page>
    <!-- Designing the Header -->

    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon :icon="swapVerticalOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

     
      <ion-toolbar>
        <ion-searchbar :placeholder="$t('Search Orders')"></ion-searchbar>
      </ion-toolbar>

      <!-- Segment part where we can switch between open and packed orders -->
      <ion-toolbar>
        <ion-segment @ionChange="segmentChanged($event)" v-model="segmentName" >
          <ion-segment-button value="open">
            <ion-label>{{ $t("OPEN") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packed">
            <ion-label>{{ $t("PACKED") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>



    <!-- Content of the app -->
    <ion-content>

      <!-- if employer is on the open segment -->
      <div v-if="segmentName == 'open'">
        <ion-card>
         <ion-card-header>
            <ion-item lines="none">
              <ion-label>
                <h2>Customer Name</h2>
                <p>Customer Id</p>
              </ion-label>
              <ion-note slot="end">order time delta</ion-note>
            </ion-item>
          </ion-card-header>

          <ion-card-content>
             <ion-list>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-note color="secondary">15 {{ $t("In Stock") }}</ion-note>
              </ion-item>
              <ion-item lines="full">
                <ion-thumbnail slot="start">
                  <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg" />
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-note color="secondary">15 {{ $t("In Stock") }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>

          <ion-item>
            <ion-icon :icon="callOutline" slot="start" />
            <ion-label>{{ $t("Phone Number") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <ion-item lines="full">
            <ion-icon :icon="mailOutline" slot="start" />
            <ion-label>{{ $t("Email") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <div>
            <ion-button fill="clear" slot="start">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>
        </ion-card>


        <ion-card>
         <ion-card-header>
            <ion-item lines="none">
              <ion-label>
                <h2>Customer Name</h2>
                <p>Customer Id</p>
              </ion-label>
              <ion-note slot="end">order time delta</ion-note>
            </ion-item>
          </ion-card-header>

          <ion-card-content>
             <ion-list>
              <ion-item lines="none">
                <ion-thumbnail slot="start">
                  <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-note color="secondary">15 {{ $t("In Stock") }}</ion-note>
              </ion-item>
              <ion-item lines="full">
                <ion-thumbnail slot="start">
                  <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg" />
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-note color="secondary">15 {{ $t("In Stock") }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>

          <ion-item>
            <ion-icon :icon="callOutline" slot="start" />
            <ion-label>{{ $t("Phone Number") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <ion-item lines="full">
            <ion-icon :icon="mailOutline" slot="start" />
            <ion-label>{{ $t("Email") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <div>
            <ion-button fill="clear" slot="start">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>
        </ion-card>
      </div>

      <!-- if employer is on the packed segment -->
      <div v-if="segmentName == 'packed'">
        <ion-card>
          
          <ion-card-header>
            <ion-item lines="none">
              <ion-label>
                <h2>Customer Name</h2>
                <p>Customer Id</p>
              </ion-label>
              <ion-note slot="end">
                <p>order time delta</p>
                <p>packed time delta</p>
              </ion-note>
            </ion-item>
          </ion-card-header>

          <ion-card-content>
            <ion-list>
              <ion-item lines="full">
                <ion-thumbnail slot="start">
                  <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
                </ion-thumbnail>
                <ion-label>
                  <h5>BRAND</h5>
                  <h2>Virtual Name</h2>
                  <p>{{ $t("Color") }} : color</p>
                  <p>{{ $t("Size") }} : size</p>
                </ion-label>
                <ion-note color="secondary">15 {{ $t("In Stock") }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>

          <ion-item>
            <ion-icon :icon="callOutline" slot="start" />
            <ion-label>{{ $t("Phone Number") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <ion-item lines="full">
            <ion-icon :icon="mailOutline" slot="start" />
            <ion-label>{{ $t("Email") }}</ion-label>
            <ion-button fill="outline" slot="end" color="medium">
              {{ $t("Copy") }}
            </ion-button>
          </ion-item>

          <div>
            <ion-button fill="clear" slot="start">
              {{ $t("Handover") }}
            </ion-button>
          </div>
        </ion-card>
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
  IonList,
} from "@ionic/vue";
import { defineComponent, ref } from "vue";
import { swapVerticalOutline, callOutline, mailOutline } from "ionicons/icons";

export default defineComponent({
  name: 'Orders',
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
    IonList,
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

   /* ion-segment {
  --background:white;
}    */


</style>