<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, alertController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from 'vuex'
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"


export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet
  },
  data() {
    return {
      loader: null as any
    }
  },
  methods: {
    async timeZoneDifferentAlert(payload: any) {
      const alert = await alertController.create({
        header: this.$t("Change time zone"),
        message: this.$t('Would you like to update your time zone to . Your profile is currently set to . This setting can always be changed from the settings menu.', { localTimeZone: payload.localTimeZone, profileTimeZone: payload.profileTimeZone }),
        buttons: [
            {
              text: this.$t("Dismiss"),
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: this.$t("Update time zone"),
              handler: () => {
                this.store.dispatch("user/setUserTimeZone", {
                    "tzId": payload.localTimeZone
                });
              },
            },
          ],
      });
      return alert.present();
    },
    async presentLoader() {
      // if currently loader is not present then creating a new loader
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        // on dismiss initializing the loader as null, so it can again be created
        this.loader = null as any;
      }
    }
  },
  async mounted() {
    // creating the loader on mounted as loadingController is taking too much time to create initially
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('timeZoneDifferent', this.timeZoneDifferentAlert);
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('timeZoneDifferent', this.timeZoneDifferentAlert);
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup(){
    const store = useStore();
    return {
      store,
    }
  },
});
</script>
