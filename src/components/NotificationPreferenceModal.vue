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
  IonList,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController,
  alertController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, save } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from '@hotwax/dxp-components'
import { showToast } from "@/utils";
import emitter from "@/event-bus"
import { generateTopicName } from "@/utils/firebase";
import { subscribeTopic, unsubscribeTopic } from '@/adapter'
import logger from "@/logger";

export default defineComponent({
  name: "NotificationPreferenceModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonFab,
    IonFabButton,
    IonIcon,
    IonItem,
    IonList,
    IonTitle,
    IonToggle,
    IonToolbar
  },
  data() {
    return {
      notificationPrefState: {} as any,
      notificationPrefToUpdate: {
        subscribe: [],
        unsubscribe: []
      } as any,
      initialNotificationPrefState: {} as any
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      notificationPrefs: 'user/getNotificationPrefs'
    }),
    // checks initial and final state of prefs to enable/disable the save button
    isButtonDisabled(): boolean {
      const enumTypeIds = Object.keys(this.initialNotificationPrefState);
      return enumTypeIds.every((enumTypeId: string) => this.notificationPrefState[enumTypeId] === this.initialNotificationPrefState[enumTypeId]);
    },
  },
  async beforeMount() {
    await this.store.dispatch('user/fetchNotificationPreferences')
    this.notificationPrefState = this.notificationPrefs.reduce((prefs: any, pref: any) => {
      prefs[pref.enumId] = pref.isEnabled
      return prefs
    }, {})
    this.initialNotificationPrefState = JSON.parse(JSON.stringify(this.notificationPrefState))
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    toggleNotificationPref(enumId: string, event: any) {
      // used click event and extracted value this way as ionChange was
      // running when the ion-toggle hydrates and hence, updated the 
      // initialNotificationPrefState here
      const value = !event.target.checked
      // updates the notificationPrefToUpdate to check which pref
      // values were updated from their initial values
      if (value !== this.initialNotificationPrefState[enumId]) {
        value
          ? this.notificationPrefToUpdate.subscribe.push(enumId)
          : this.notificationPrefToUpdate.unsubscribe.push(enumId)
      } else {
        !value
          ? this.notificationPrefToUpdate.subscribe.splice(this.notificationPrefToUpdate.subscribe.indexOf(enumId), 1)
          : this.notificationPrefToUpdate.unsubscribe.splice(this.notificationPrefToUpdate.subscribe.indexOf(enumId), 1)
      }

      // updating this.notificationPrefState as it is used to
      // determine the save button disable state, hence, updating
      // is necessary to recompute isButtonDisabled property
      this.notificationPrefState[enumId] = value
    },
    async updateNotificationPref() {
      // added loader as the API call is in pending state for too long, blocking the flow
      emitter.emit("presentLoader");
      try {
        await this.handleTopicSubscription()
      } catch (error) {
        logger.error(error)
      } finally {
        emitter.emit("dismissLoader")
      }
    },
    async handleTopicSubscription() {
      const facilityId = (this.currentFacility as any).facilityId
      const subscribeRequests = [] as any
      this.notificationPrefToUpdate.subscribe.map(async (enumId: string) => {
        const topicName = generateTopicName(facilityId, enumId)
        await subscribeRequests.push(subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID))
      })

      const unsubscribeRequests = [] as any
      this.notificationPrefToUpdate.unsubscribe.map(async (enumId: string) => {
        const topicName = generateTopicName(facilityId, enumId)
        await unsubscribeRequests.push(unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID))
      })

      const responses = await Promise.allSettled([...subscribeRequests, ...unsubscribeRequests])
      const hasFailedResponse = responses.some((response: any) => response.status === "rejected")
      showToast(
        hasFailedResponse
          ? translate('Notification preferences not updated. Please try again.')
          : translate('Notification preferences updated.')
      )
    },
    async confirmSave() {
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
              await this.updateNotificationPref();
              modalController.dismiss({ dismissed: true });
            }
          }
        ],
      });
      return alert.present();
    },
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      translate,
      save,
      store
    };
  },
});
</script>
