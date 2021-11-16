<template>
  <ion-page>
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
      <ion-toolbar>
        <ion-segment v-model="segmentName" >
          <ion-segment-button value="open">
            <ion-label>{{ $t("Open") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="packed">
            <ion-label>{{ $t("Packed") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="segmentName == 'open'">
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
                <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
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
          <div>
            <ion-button fill="clear">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>
        </ion-card>

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
                <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
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
          <div>
            <ion-button fill="clear">
              {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>
        </ion-card>
      </div>      
      <div v-if="segmentName == 'packed'">
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
                <img src="https://images.all-free-download.com/images/graphicthumb/fashion_model_portrait_205201.jpg"/>
              </ion-thumbnail>
              <ion-label>
                <h5>BRAND</h5>
                <h2>Virtual Name</h2>
                <p>{{ $t("Color") }} : color</p>
                <p>{{ $t("Size") }} : size</p>
              </ion-label>
              <ion-note color="success">15 {{ $t("In Stock") }}</ion-note>
            </ion-item>
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
          <div>
            <ion-button fill="clear">
              {{ $t("Ready For Pickup") }}
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
    IonNote,
    IonIcon,
    IonButtons,
    IonThumbnail,
    IonList,
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

.margin-bottom{
  margin-bottom: 1px solid black;
}

</style>