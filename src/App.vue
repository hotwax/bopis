<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { translate, emitter, firebaseMessaging, logger, useNotificationStore, i18n } from "@common";
import { useAuth } from "@common/composables/useAuth";
import { Settings } from "luxon";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import { firebaseUtil } from "@/utils/firebaseUtil";

const { isAuthenticated } = useAuth();
const loader = ref<any>(null);

const userProfile = computed(() => useUserStore().getUserProfile);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);



const presentLoader = async (options = { message: "", backdropDismiss: false }) => {
  if (options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController.create({
      message: options.message ? translate(options.message) : (options.backdropDismiss ? translate("Click the backdrop to dismiss.") : translate("Loading...")),
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
    backdropDismiss: false
  });

  emitter.on("presentLoader", (options: any) => presentLoader(options));
  emitter.on("dismissLoader", dismissLoader);

  if (userProfile.value && userProfile.value.timeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }

  if(userProfile.value?.userId) {
    i18n.global.locale.value = useUserStore().getLocale
  }

  const currentProductStore: any = useProductStore().getCurrentProductStore;

    if (isAuthenticated.value && currentProductStore?.productStoreId) {
      await useProductStore().fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error));

      // A session that began before device ids were minted at login has none yet, and every
      // firebase call is keyed by it.
      if (!useNotificationStore().getFirebaseDeviceId) {
        useNotificationStore().setFirebaseDeviceId(firebaseMessaging.generateDeviceId());
      }
      // Like login: this device's subscriptions decide, and no gesture here, so never let this raise
      // a permission prompt.
      await useNotificationStore().fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userId, useNotificationStore().getFirebaseDeviceId).catch((error) => logger.error(error));
      if (allNotificationPrefs.value?.length && firebaseUtil.canInitialiseWithoutPrompting()) {
        await firebaseUtil.initialiseFirebaseMessaging();
      }
    }
});

onUnmounted(() => {
  emitter.off("presentLoader", (options: any) => presentLoader(options));
  emitter.off("dismissLoader", dismissLoader);
});
</script>
