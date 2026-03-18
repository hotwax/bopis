<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { translate, emitter, logger, firebaseMessaging, useNotificationStore } from "@common";
import { Settings } from "luxon";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import { useAuth } from "@/composables/auth";

const { isAuthenticated } = useAuth();
const loader = ref<any>(null);
const appFirebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG as any);
const appFirebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const userProfile = computed(() => useUserStore().getUserProfile);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);

const presentLoader = async (options = { message: "", backdropDismiss: false }) => {
  if (options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController.create({
      message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
      translucent: true,
      backdropDismiss: options.backdropDismiss || false
    });
  }
  loader.value.present();
};

const dismissLoader = () => {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null;
  }
};

onMounted(async () => {
  loader.value = await loadingController.create({
    message: translate("Loading..."),
    translucent: true,
    backdropDismiss: false
  });

  emitter.on("presentLoader", (options: any) => presentLoader(options));
  emitter.on("dismissLoader", dismissLoader);

  if (userProfile.value && userProfile.value.userTimeZone) {
    Settings.defaultZone = userProfile.value.userTimeZone;
  }

  const currentEComStore: any = useProductStore().getCurrentEComStore;

    if (isAuthenticated.value && currentEComStore?.productStoreId) {
      await useProductStore().fetchProductStoreSettings(currentEComStore.productStoreId).catch((error) => logger.error(error));

      if (appFirebaseConfig && appFirebaseConfig.apiKey && allNotificationPrefs.value?.length) {
        const notificationStore = useNotificationStore();
        await firebaseMessaging.initialiseFirebaseApp(
          appFirebaseConfig,
          appFirebaseVapidKey,
          async (token: string) => {
            await notificationStore.storeClientRegistrationToken(token, firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId), import.meta.env.VITE_NOTIF_APP_ID);
          },
          (notification: any) => {
            notificationStore.addNotification(notification);
          }
        );
      }
    }
});

onUnmounted(() => {
  emitter.off("presentLoader", (options: any) => presentLoader(options));
  emitter.off("dismissLoader", dismissLoader);
});
</script>
