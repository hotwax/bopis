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
            <ion-item v-for="notification in notifications" :key="notification.notificationId">
              <ion-label class="ion-text-wrap">
                <h3>{{ notification.title }}</h3>
                <p>{{ notification.body }}</p>
              </ion-label>
              <ion-note slot="end">{{ timeTillNotification(notification.receivedAt) }}</ion-note>
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
import { IonBackButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar, modalController, onIonViewWillEnter } from "@ionic/vue";
import { cogOutline } from 'ionicons/icons';
import { computed } from "vue";
import { DateTime } from "luxon";
import NotificationPreferenceModal from '@/components/NotificationPreferenceModal.vue'
import { translate } from "@common";
import { useNotificationHistoryStore } from "@/store/notificationHistory";

const notificationHistoryStore = useNotificationHistoryStore();
const notifications = computed(() => notificationHistoryStore.getNotifications);

onIonViewWillEnter(async () => {
  // Re-read on every entry: history persists across logins, so the in-memory copy can belong to
  // a previous session or a different OMS instance.
  await notificationHistoryStore.hydrate();
  await notificationHistoryStore.markAllRead();
});

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
