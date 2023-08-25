<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Notification Preference") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ 'Notification setting 1' }}</ion-label>
        <ion-toggle slot="end" />
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ 'Notification setting 1' }}</ion-label>
        <ion-toggle slot="end" />
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ 'Notification setting 1' }}</ion-label>
        <ion-toggle slot="end" />
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from "@ionic/vue";
import {
  save
} from 'ionicons/icons';
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { useStore } from "vuex";

export default defineComponent({
  name: "NotificationPreference",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonFab,
    IonFabButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonTitle,
    IonToggle,
    IonToolbar
  },
  data () {
    return {
      
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      save,
      store
    };
  },
});
</script>

<style scoped>
</style>