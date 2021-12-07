<template>
  <ion-page>
    <ion-tabs>
      <ion-tab-bar slot="bottom">
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
import { IonLabel, IonTabBar, IonTabButton, IonTabs, IonIcon, IonPage } from "@ionic/vue";
import {
 infiniteOutline,
 settings
} from "ionicons/icons";
export default {
  name: "Tabs",
  components: { IonLabel, IonTabs, IonTabBar, IonTabButton, IonIcon, IonPage },
  setup() {
    const route = useRoute();
    return {
      infiniteOutline,
      settings
    };
  },
};
</script>