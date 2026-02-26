<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, loadingController } from '@ionic/vue';
import { onMounted, onUnmounted, ref } from 'vue';
import emitter from "@/event-bus"
import { initialise, resetConfig } from '@/adapter'
import { initialiseFirebaseApp, translate, useProductIdentificationStore } from "@hotwax/dxp-components";
import logger from '@/logger'
import { fireBaseUtil } from '@/utils/fireBaseUtil';
import { UtilService } from './services/UtilService';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const loader = ref(null as any);
const maxAge = process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0;
const appFirebaseConfig = ref(JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG || '{}'));
const appFirebaseVapidKey = process.env.VUE_APP_FIREBASE_VAPID_KEY;

async function presentLoader(options = { message: '', backdropDismiss: true }) {
  // When having a custom message remove already existing loader
  if (options.message && loader.value) dismissLoader();

  // if currently loader is not present then creating a new loader
  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: options.message ? translate(options.message) : translate("Loading…"),
        translucent: true,
        backdropDismiss: options.backdropDismiss
      });
  }
  loader.value.present();
}

function dismissLoader() {
  if (loader.value) {
    loader.value.dismiss();
    // on dismiss initializing the loader as null, so it can again be created
    loader.value = null;
  }
}

async function unauthorised() {
  // Mark the user as unauthorised, this will help in not making the logout api call in actions
  await userStore.logout({ isUserUnauthorised: true });
  const redirectUrl = window.location.origin + '/login'
  window.location.href = `${process.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
}

// initialise in setup (replaces created hook)
initialise({
  token: userStore.token,
  instanceUrl: userStore.instanceUrl,
  cacheMaxAge: maxAge,
  events: {
    unauthorised: unauthorised,
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  },
  systemType: "MOQUI"
})

onMounted(async () => {
  // creating the loader on mounted as loadingController is taking too much time to create initially
  loader.value = await loadingController
    .create({
      message: translate("Loading…"),
      translucent: true,
      backdropDismiss: true
    });
  emitter.on('presentLoader', presentLoader);
  emitter.on('dismissLoader', dismissLoader);

  // If fetching identifier without checking token then on login the app stucks in a loop, as the mounted hook runs before
  // token is available which results in api failure as unauthenticated, thus making logout call and then login call again and so on.
  if (userStore.token) {
    // The below block is added to handle the login flow in bopis app on refresh
    // This is just a verification call so that app logouts correctly, becuase this is a moqui first app
    try {
      await UtilService.isEnumExists("BOPIS_PART_ODR_REJ")
    } catch (err) {
      logger.error(err)
    }
    // Get product identification from api using dxp-component
    await useProductIdentificationStore().getIdentificationPref(userStore.currentEComStore?.productStoreId)
      .catch((error) => logger.error(error));

    // check if firebase configurations are there.
    if (appFirebaseConfig.value && appFirebaseConfig.value.apiKey && userStore.allNotificationPrefs?.length) {
      // initialising and connecting firebase app for notification support
      await initialiseFirebaseApp(
        appFirebaseConfig.value,
        appFirebaseVapidKey,
        fireBaseUtil.storeClientRegistrationToken,
        fireBaseUtil.addNotification,
      )
    }
  }
})

onUnmounted(() => {
  emitter.off('presentLoader', presentLoader);
  emitter.off('dismissLoader', dismissLoader);
  resetConfig()
})
</script>
