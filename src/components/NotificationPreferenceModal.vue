<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Notification Preference") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <div v-if="!notificationPrefs.length" class="ion-text-center">
      <p>{{ translate("Notification preferences not found.")}}</p>
    </div>
    <ion-list v-else>
      <ion-item :key="pref.enumId" v-for="pref in notificationPrefs">
        <ion-toggle label-placement="start" @click="toggleNotificationPref(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="isButtonDisabled" @click="confirmSave()">
        <ion-icon :icon="save" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonList, IonTitle, IonToggle, IonToolbar, modalController, alertController } from "@ionic/vue";
import { computed, onBeforeMount, ref } from "vue";
import { closeOutline, save } from "ionicons/icons";
import { translate } from '@hotwax/dxp-components'
import { commonUtil } from "@/utils/commonUtil";
import emitter from "@/event-bus"
import { fireBaseUtil } from "@/utils/fireBaseUtil";
import { subscribeTopic, unsubscribeTopic } from '@/adapter'
import logger from "@/logger";
import { useUserStore as usePiniaUserStore } from "@/store/user";

const userStore = usePiniaUserStore();
const notificationPrefs = computed(() => userStore.getNotificationPrefs);
const currentFacility = computed(() => userStore.getCurrentFacility);

const notificationPrefState = ref({} as any);
const notificationPrefToUpdate = ref({
  subscribe: [] as string[],
  unsubscribe: [] as string[]
});
const initialNotificationPrefState = ref({} as any);

const isButtonDisabled = computed(() => {
  const enumTypeIds = Object.keys(initialNotificationPrefState.value);
  return enumTypeIds.every((enumTypeId: string) => notificationPrefState.value[enumTypeId] === initialNotificationPrefState.value[enumTypeId]);
});

onBeforeMount(async () => {
  await userStore.fetchNotificationPreferences();
  notificationPrefState.value = notificationPrefs.value.reduce((prefs: any, pref: any) => {
    prefs[pref.enumId] = pref.isEnabled
    return prefs
  }, {});
  initialNotificationPrefState.value = JSON.parse(JSON.stringify(notificationPrefState.value));
});

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

function toggleNotificationPref(enumId: string, event: any) {
  const value = !event.target.checked;
  if (value !== initialNotificationPrefState.value[enumId]) {
    if (value) {
      if (!notificationPrefToUpdate.value.subscribe.includes(enumId)) {
        notificationPrefToUpdate.value.subscribe.push(enumId);
      }
      const index = notificationPrefToUpdate.value.unsubscribe.indexOf(enumId);
      if (index > -1) notificationPrefToUpdate.value.unsubscribe.splice(index, 1);
    } else {
      if (!notificationPrefToUpdate.value.unsubscribe.includes(enumId)) {
        notificationPrefToUpdate.value.unsubscribe.push(enumId);
      }
      const index = notificationPrefToUpdate.value.subscribe.indexOf(enumId);
      if (index > -1) notificationPrefToUpdate.value.subscribe.splice(index, 1);
    }
  } else {
    const subIndex = notificationPrefToUpdate.value.subscribe.indexOf(enumId);
    if (subIndex > -1) notificationPrefToUpdate.value.subscribe.splice(subIndex, 1);
    const unsubIndex = notificationPrefToUpdate.value.unsubscribe.indexOf(enumId);
    if (unsubIndex > -1) notificationPrefToUpdate.value.unsubscribe.splice(unsubIndex, 1);
  }
  notificationPrefState.value[enumId] = value;
}

async function updateNotificationPref() {
  emitter.emit("presentLoader");
  try {
    await handleTopicSubscription();
  } catch (error) {
    logger.error(error);
  } finally {
    emitter.emit("dismissLoader");
  }
}

async function handleTopicSubscription() {
  const facilityId = (currentFacility.value as any)?.facilityId;
  const subscribeRequests = notificationPrefToUpdate.value.subscribe.map(async (enumId: string) => {
    const topicName = fireBaseUtil.generateTopicName(facilityId, enumId);
    return subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID);
  });

  const unsubscribeRequests = notificationPrefToUpdate.value.unsubscribe.map(async (enumId: string) => {
    const topicName = fireBaseUtil.generateTopicName(facilityId, enumId);
    return unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID);
  });

  const responses = await Promise.allSettled([...subscribeRequests, ...unsubscribeRequests]);
  const hasFailedResponse = responses.some((response: any) => response.status === "rejected");
  commonUtil.showToast(
    hasFailedResponse
      ? translate('Notification preferences not updated. Please try again.')
      : translate('Notification preferences updated.')
  );
}

async function confirmSave() {
  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      {
        text: translate("Cancel"),
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          await updateNotificationPref();
          modalController.dismiss({ dismissed: true });
        }
      }
    ],
  });
  return alert.present();
}
</script>
