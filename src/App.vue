<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { mapGetters, useStore } from 'vuex';
import { initialise, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';
import { initialiseFirebaseApp, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from '@/logger'
import { addNotification, storeClientRegistrationToken } from '@/utils/firebase';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0,
      appFirebaseConfig: JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG),
      appFirebaseVapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY,
    }
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: true }) {
      // When having a custom message remove already existing loader
      if(options.message && this.loader) this.dismissLoader();

      // if currently loader is not present then creating a new loader
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: options.backdropDismiss
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
    },
    async unauthorised() {
      // Mark the user as unauthorised, this will help in not making the logout api call in actions
      this.store.dispatch("user/logout", { isUserUnauthorised: true });
      const redirectUrl = window.location.origin + '/login'
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    }
  }, 
  computed: {
    ...mapGetters({
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl',
      currentProductStore: 'user/getCurrentProductStore',
      allNotificationPrefs: 'user/getAllNotificationPrefs'
    })
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorised,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        }
      },
      systemType: "MOQUI"
    })
  },
  async mounted() {
    // creating the loader on mounted as loadingController is taking too much time to create initially
    this.loader = await loadingController
      .create({
        message: translate("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);

    // If fetching identifier without checking token then on login the app stucks in a loop, as the mounted hook runs before
    // token is available which results in api failure as unauthenticated, thus making logout call and then login call again and so on.
    if(this.userToken) {
      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(this.currentProductStore?.productStoreId)
        .catch((error) => logger.error(error));

      // check if firebase configurations are there.
      if (this.appFirebaseConfig && this.appFirebaseConfig.apiKey && this.allNotificationPrefs?.length) {
        // initialising and connecting firebase app for notification support
        await initialiseFirebaseApp(
          this.appFirebaseConfig,
          this.appFirebaseVapidKey,
          storeClientRegistrationToken,
          addNotification,
        )
      }
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    resetConfig()
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      router,
      store,
      translate
    }
  }
});
</script>
