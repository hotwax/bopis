<template>
  <ion-page>
    <ion-content>
      <div class="center-div" v-if="!errorMessage">
        <p>{{ translate("Logging in...") }}</p>
      </div>
      <div class="center-div">
        <ion-item lines="none" v-if='errorMessage'>
          <ion-icon slot="start" color="warning" :icon="warningOutline" />
          <h4>{{ translate('Login failed') }}</h4>
        </ion-item>
        <p>{{ translate(errorMessage) }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonIcon, IonPage, onIonViewDidEnter, onIonViewDidLeave } from "@ionic/vue";
import { ref } from "vue";
import router from "@/router";
import { emitter, translate, useEmbeddedAppStore, useNotificationStore, useShopify } from "@common";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";
import { firebaseUtil } from "@/utils/firebaseUtil";
import { warningOutline } from "ionicons/icons";

const { appBridgeLogin } = useShopify();

const errorMessage = ref('');

onIonViewDidEnter(async () => {
  try {
    errorMessage.value = '';
    emitter.emit("presentLoader");

    let { shop, host } = router.currentRoute.value.query;

    const success = await appBridgeLogin(shop as string, host as string);
    
    if (success) {
      await useUserStore().fetchPermissions()
      await useUserStore().fetchUserProfile()
      const productStore = useProductStore()
      await productStore.fetchUserFacilities()
      await productStore.fetchFacilityPreference()
      await productStore.fetchProductStores()
      await productStore.fetchProductStorePreference()
      await productStore.fetchEComStoreDependencies(productStore.getCurrentEComStore.productStoreId)

      const notificationStore = useNotificationStore();
      await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, useUserStore().getUserProfile.userId)
      await firebaseUtil.initialiseFirebaseMessaging();
      router.push("/");
    } else {
      throw new Error("App Bridge Login failed.");
    }
  } catch (error: any) {
    console.error("Error during Shopify view initialization:", error);
    errorMessage.value = "Something went wrong, please contact administrator";
    useEmbeddedAppStore().$reset();
  }
  emitter.emit("dismissLoader");
});

onIonViewDidLeave(() => {
  emitter.emit("dismissLoader");
});
</script>

<style scoped>
.center-div {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
</style>
