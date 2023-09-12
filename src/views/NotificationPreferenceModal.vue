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
import { useNotificationStore } from '@hotwax/dxp-components'
import { translate } from "@/i18n";
import { showToast } from "@/utils";
import emitter from "@/event-bus"

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
      notificationPrefs: [] as any,
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
      instanceUrl: 'user/getInstanceUrl'
    })
  },
  async beforeMount() {
    this.notificationPrefs = await this.notificationsStore.fetchNotificationPreferences(this.instanceUrl, this.currentFacility.facilityId)
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
        const successCount: any = await this.notificationsStore.handleTopicSubscription(this.notificationPrefToUpate, this.instanceUrl, this.currentFacility.facilityId)
        this.handlePreferenceUpdateMessage(successCount)
      } catch (error) {
        console.error(error)
      } finally {
        emitter.emit("dismissLoader")
      }
    },
    handlePreferenceUpdateMessage(successCount: number) {
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
    const notificationsStore = useNotificationStore()

    return {
      closeOutline,
      save,
      notificationsStore,
      store
    };
  },
});
</script>

<style scoped>
</style>