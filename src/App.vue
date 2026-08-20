<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, loadingController } from "@ionic/vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { translate, emitter, logger, useNotificationStore, i18n } from "@common";
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

  if (userProfile.value && userProfile.value.userTimeZone) {
    Settings.defaultZone = userProfile.value.timeZone;
  }

  if(userProfile.value?.userId) {
    i18n.global.locale.value = useUserStore().getLocale
  }

  const currentProductStore: any = useProductStore().getCurrentProductStore;

    if (isAuthenticated.value && currentProductStore?.productStoreId) {
      await useProductStore().fetchProductStoreSettings(currentProductStore.productStoreId).catch((error) => logger.error(error));

      if (allNotificationPrefs.value?.length) {
        await firebaseUtil.initialiseFirebaseMessaging();
      }
    }
});

onUnmounted(() => {
  emitter.off("presentLoader", (options: any) => presentLoader(options));
  emitter.off("dismissLoader", dismissLoader);
});
</script>
