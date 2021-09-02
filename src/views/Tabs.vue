<template>
  <ion-page>
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="catalog" href="/tabs/Catalog">
          <ion-icon :icon="shirtOutline" />
          <ion-label>{{ $t("Catalog") }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="orders" href="/tabs/Orders">
          <ion-icon :icon="infiniteOutline" />
          <ion-label>{{ $t("Orders") }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="more" href="/tabs/More">
          <ion-icon :icon="menuOutline" />
          <ion-label>{{ $t("More") }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script lang="ts">
import { useRoute } from "vue-router";
import { IonLabel, IonTabBar, IonTabButton, IonTabs, IonIcon, IonPage } from "@ionic/vue";
import {
 shirtOutline,
 infiniteOutline,
 menuOutline
} from "ionicons/icons";
export default {
  name: "Tabs",
  components: { IonLabel, IonTabs, IonTabBar, IonTabButton, IonIcon, IonPage },
  setup() {
    const route = useRoute();
    return {
      shirtOutline,
      infiniteOutline,
      menuOutline
    };
  },
};
</script>