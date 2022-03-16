<template>
  <ion-page>
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <!-- <ion-tab-button tab="catalog" href="/tabs/catalog">
          <ion-icon :icon="shirtOutline" />
          <ion-label>{{ $t("Catalog") }}</ion-label>
        </ion-tab-button> -->
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
import { IonIcon, IonLabel, IonPage, IonTabBar, IonTabButton, IonTabs } from "@ionic/vue";
import {
  infiniteOutline,
  settings,
  shirtOutline,
} from "ionicons/icons";

export default {
  name: "Tabs",
  components: { IonIcon, IonLabel, IonPage, IonTabBar, IonTabButton, IonTabs },
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
<style scoped>
ion-tab-bar {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  bottom: 24px;
  filter: drop-shadow(0px 6px 10px rgba(0, 0, 0, 0.14)) drop-shadow(0px 1px 18px rgba(0, 0, 0, 0.12)) drop-shadow(0px 3px 5px rgba(0, 0, 0, 0.2));
  width: 375px;
  border-radius: 16px;
}
</style>