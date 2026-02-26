<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/tabs/orders" />
        <ion-title>{{ translate("Notifications") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
          <ion-list v-if="notifications.length">
            <ion-item v-for="(notification, index) in notifications" :key="index">
              <ion-label class="ion-text-wrap">
                <h3>{{ notification.data.title }}</h3>
                <p>{{ notification.data.body }}</p>
              </ion-label>
              <ion-note slot="end">{{ timeTillNotification(notification.time) }}</ion-note>
            </ion-item>
          </ion-list>
          <div v-else class="ion-text-center">
            {{ translate('No notifications to show') }}
          </div>
      </main>
      <ion-fab slot="fixed" size="small" vertical="top" horizontal="end" :edge="true">
        <ion-fab-button size="small" @click="openNotificationSettings()">
          <ion-icon :icon="cogOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, modalController } from "@ionic/vue";
import { cogOutline } from 'ionicons/icons';
import { computed } from "vue";
import { DateTime } from "luxon";
import NotificationPreferenceModal from '@/components/NotificationPreferenceModal.vue'
import { translate } from "@hotwax/dxp-components";
import { useUserStore } from "@/store/user";
const notifications = computed(() => useUserStore().getNotifications);

async function openNotificationSettings() {
  const timeZoneModal = await modalController.create({
    component: NotificationPreferenceModal,
  });
  return timeZoneModal.present();
}

const timeTillNotification = (time: number) => {
  const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
  return DateTime.local().plus(timeDiff).toRelative();
}

</script>

<style scoped>
main {
  margin: var(--spacer-base) auto 0;
}

@media (min-width: 991px) {
  main {
    display: flex;
    justify-content: center;
  }

  main > ion-list {
    max-width: 50ch;
    flex: 1;
  }
}
</style>
