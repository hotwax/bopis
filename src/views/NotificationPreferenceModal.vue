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
    <div v-if="!notificationPrefs.length" class="ion-text-center">
      <p>{{ $t("Notification preferences not found.")}}</p>
    </div>
    <ion-list v-else>
      <ion-item :key="pref.enumId" v-for="pref in notificationPrefs">
        <ion-label class="ion-text-wrap">{{ pref.description }}</ion-label>
        <ion-toggle @ionChange="toggleNotificationPref(pref.enumId, $event.detail.checked)" :checked="pref.isEnabled" slot="end" />
      </ion-item>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="confirmSave()">
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
  modalController,
  alertController,
} from "@ionic/vue";
import {
  save
} from 'ionicons/icons';
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from "@/i18n";
import { showToast } from "@/utils";
import emitter from "@/event-bus"
import { generateTopicName } from "@/utils/firebase";
import {
  subscribeTopic,
  unsubscribeTopic
} from '@hotwax/oms-api';

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
  data() {
    return {
      initialNotificationPref: {} as any,
      notificationPrefToUpate: {
        subscribe: [],
        unsubscribe: []
      } as any
    }
  },
  computed: {
    ...mapGetters({
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      notificationPrefs: 'user/getNotificationPrefs'
    })
  },
  async beforeMount() {
    await this.store.dispatch('user/fetchNotificationPreferences')
    this.initialNotificationPref = this.notificationPrefs.reduce((notificationPref: any, pref: any) => {
      notificationPref[pref.enumId] = pref.isEnabled
      return notificationPref
    }, {})
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    toggleNotificationPref(enumId: string, value: boolean) {
      // updates the notificationPrefToUpate to check which pref
      // values were updated from their initial values
      if (value !== this.initialNotificationPref[enumId]) {
        value
          ? this.notificationPrefToUpate.subscribe.push(enumId)
          : this.notificationPrefToUpate.unsubscribe.push(enumId)
      } else {
        !value
          ? this.notificationPrefToUpate.subscribe.splice(this.notificationPrefToUpate.subscribe.indexOf(enumId), 1)
          : this.notificationPrefToUpate.unsubscribe.splice(this.notificationPrefToUpate.subscribe.indexOf(enumId), 1)
      }
    },
    async updateNotificationPref() {
      // TODO disbale button if initial and final are same
      emitter.emit("presentLoader");
      try {
        await this.handleTopicSubscription()
      } catch (error) {
        console.error(error)
      } finally {
        emitter.emit("dismissLoader")
      }
    },
    async handleTopicSubscription() {
      const subscribeRequests = [] as any
      const oms = this.instanceUrl
      const facilityId = (this.currentFacility as any).facilityId
      this.notificationPrefToUpate.subscribe.map(async (enumId: string) => {
        const topicName = generateTopicName(oms, facilityId, enumId)
        await subscribeRequests.push(subscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID).catch((err: any) => {
          return err;
        }))
      })

      const unsubscribeRequests = [] as any
      this.notificationPrefToUpate.unsubscribe.map(async (enumId: string) => {
        const topicName = generateTopicName(oms, facilityId, enumId)
        await unsubscribeRequests.push(unsubscribeTopic(topicName, process.env.VUE_APP_NOTIF_APP_ID).catch((err: any) => {
          return err;
        }))
      })

      const responses = await Promise.all([...subscribeRequests, ...unsubscribeRequests])
      const successCount = responses.reduce((successCount: number, response: any) => {
        if (response.data.successMessage) {
          successCount++
        }
        return successCount
      }, 0)

      // using successCount count to handle toast message
      if (successCount === this.notificationPrefToUpate.subscribe.length + this.notificationPrefToUpate.unsubscribe.length) {
        showToast(translate('Notification preferences updated.'))
      } else {
        showToast(translate('Notification preferences not updated. Please try again.'))
      }
    },
    async confirmSave() {
      const message = this.$t("Are you sure you want to update the notification preferences?");
      const alert = await alertController.create({
        header: this.$t("Update notification preferences"),
        message,
        buttons: [
          {
            text: this.$t("Cancel"),
          },
          {
            text: this.$t("Confirm"),
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
      save,
      store
    };
  },
});
</script>

<style scoped>
</style>