<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="catalog" href="/tabs/catalog">
          <ion-icon :icon="shirtOutline" />
          <ion-label>{{ $t("Catalog") }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="orders" href="/tabs/orders">
          <ion-icon :icon="infiniteOutline" />
          <ion-label>{{ $t("Orders") }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="more" href="/tabs/settings">
          <ion-icon :icon="settings" />
          <ion-label>{{ $t("Settings") }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script lang="ts">
import { useRoute } from "vue-router";
import { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from "@ionic/vue";
import {
  infiniteOutline,
  settings,
  shirtOutline,
} from "ionicons/icons";

export default {
  name: "Tabs",
  components: { IonIcon, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs },
  setup () {
    const route = useRoute();
    return {
      infiniteOutline,
      settings,
      shirtOutline
    };
  }
};
</script>