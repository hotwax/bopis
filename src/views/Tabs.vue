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
@media (min-width: 991px) {
  ion-tab-bar {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 24px;
    box-shadow: rgb(0 0 0 / 20%) 0px 3px 1px -2px, rgb(0 0 0 / 14%) 0px 2px 2px 0px, rgb(0 0 0 / 12%) 0px 1px 5px 0px;
    width: 375px;
    border-radius: 15px;
  }
}
</style>
