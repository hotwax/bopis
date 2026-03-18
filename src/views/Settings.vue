<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ translate("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.username }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.userFullName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button :standalone-hidden="!useUserStore().hasPermission('COMMON_ADMIN')" fill="outline" @click="goToLaunchpad()">
            {{ translate("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ translate("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ translate('OMS') }}</h1>
      </div>
      <section>
        <DxpOmsInstanceNavigator />
        <DxpFacilitySwitcher @updateFacility="fetchFacilityDependencies" />
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ translate("Re-route Fulfillment") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ translate("Order edit permissions") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Control what your customers are allowed to edit on their order when they are editing their order on Re-route Fulfillment.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.allowDeliveryMethodUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryMethodUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryMethodUpdate, $event.detail.checked)">{{ translate("Delivery method") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.allowDeliveryAddressUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryAddressUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryAddressUpdate, $event.detail.checked)">{{ translate("Delivery address") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.allowPickupUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowPickupUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowPickupUpdate, $event.detail.checked)">{{ translate("Pick up location") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <!-- <p>Uploading order cancelations to Shopify is currently disabled. Order cancelations in HotWax will not be synced to Shopify.</p> -->
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.allowCancel).length == 0" :checked="rerouteFulfillmentConfig.allowCancel.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowCancel, $event.detail.checked)">{{ translate("Cancel order before fulfillment") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.orderItemSplit).length == 0" :checked="rerouteFulfillmentConfig.orderItemSplit.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.orderItemSplit, $event.detail.checked)">{{ translate("Order item split") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-label v-if="Object.keys(getShipmentMethodConfig()).length > 0">
              <p class="overline">{{ translate('Shipment method') }}</p>
              {{ getShipmentMethodConfig()?.shipmentMethodDesc }}
              <p>{{ getShipmentMethodConfig().carrierName }}</p>
            </ion-label>
            <ion-label v-else>
              {{ translate('Shipment method') }}
            </ion-label>
            <ion-button slot="end" fill="outline" color="dark" :disabled="!useUserStore().hasPermission('COMMON_ADMIN') || Object.keys(rerouteFulfillmentConfig.shippingMethod).length == 0" @click="openEditShipmentMethodModal(rerouteFulfillmentConfig.shippingMethod)">{{ Object.keys(getShipmentMethodConfig()).length > 0 ? translate('Edit') : translate('Add')}}</ion-button>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Partial Order rejection") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify whether you reject a BOPIS order partially when any order item inventory is insufficient at the store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :disabled="!useUserStore().hasPermission('COMMON_ADMIN')" :checked="isPartialOrderRejectionEnabled" @click.prevent="setBopisProductStoreSettings($event, 'BOPIS_PART_ODR_REJ', !isPartialOrderRejectionEnabled)">{{ translate("Allow partial rejection") }}</ion-toggle>
          </ion-item>
        </ion-card>
        
      </section>

      <hr />
      <DxpAppVersionInfo/>

      <section>
        <DxpProductIdentifier />
        <DxpTimeZoneSwitcher @timeZoneUpdated="timeZoneUpdated" />
        <DxpLanguageSwitcher />

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Enabling this will show only shipping orders and hide all pickup orders.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isShowShippingOrdersEnabled" @click.prevent="setBopisProductStoreSettings($event, 'SHOW_SHIPPING_ORDERS', !isShowShippingOrdersEnabled)">{{ translate("Show shipping orders") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Packing Slip") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Packing slips help customer reconcile their order against the delivered items.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isPrintPackingSlipEnabled" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PACKING_SLIPS', !isPrintPackingSlipEnabled)">{{ translate("Generate packing slips") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Track Pickers") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Track who picked orders by entering picker IDs when packing an order.') }}
          </ion-card-content>
          <ion-item :disabled="!useUserStore().hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isTrackingEnabled" @click.prevent="setBopisProductStoreSettings($event, 'ENABLE_TRACKING', !isTrackingEnabled)">{{ translate("Enable tracking") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission('COMMON_ADMIN')">
            <ion-toggle label-placement="start" :checked="isPrintPicklistsEnabled" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PICKLISTS', !isPrintPicklistsEnabled)">{{ translate("Print picklists") }}</ion-toggle>
          </ion-item> 
        </ion-card>

        <ion-card v-if="useUserStore().hasPermission('BOPIS_REQUEST_TRANSFER_UPDATE')">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Request Transfer") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This will allow store associates to request the item from another store when it is not available in their current stock') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission('BOPIS_REQUEST_TRANSFER_UPDATE')">
            <ion-toggle label-placement="start" :checked="isRequestTransferEnabled" @click.prevent="setBopisProductStoreSettings($event, 'REQUEST_TRANSFER', !isRequestTransferEnabled)">{{ translate("Show Request Transfer") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card v-if="useUserStore().hasPermission('BOPIS_POD_UPDATE')">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Proof of delivery") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This will allow store associates to verify the delivery of pickup order') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle label-placement="start" :checked="isHandoverProofEnabled" @click.prevent="setBopisProductStoreSettings($event, 'HANDOVER_PROOF', !isHandoverProofEnabled)">{{ translate("Show proof of delivery") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <ion-card v-if="notificationPrefs.length">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification Preference") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Select the notifications you want to receive.') }}
          </ion-card-content>
          <ion-list>
            <ion-item :key="pref.enumId" v-for="pref in notificationPrefs" lines="none">
              <ion-toggle label-placement="start" @click.prevent="confirmNotificationPrefUpdate(pref.enumId, $event)" :checked="pref.isEnabled">{{ pref.description }}</ion-toggle>
            </ion-item>
          </ion-list>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToggle, IonToolbar, modalController, onIonViewWillEnter } from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { openOutline } from 'ionicons/icons'
import Image from '@/components/Image.vue';
import { DateTime } from 'luxon';

import { commonUtil, emitter, firebaseMessaging, logger, translate, useNotificationStore } from '@common';
import EditShipmentMethodModal from '@/components/EditShipmentMethodModal.vue';
import DxpTimeZoneSwitcher from "@/components/DxpTimeZoneSwitcher.vue"
import DxpOmsInstanceNavigator from "@/components/DxpOmsInstanceNavigator.vue";
import DxpProductIdentifier from "@/components/DxpProductIdentifier.vue";
import DxpLanguageSwitcher from "@/components/DxpLanguageSwitcher.vue";
import DxpFacilitySwitcher from "@/components/DxpFacilitySwitcher.vue";

import { useUserStore } from '@/store/user';
import { useOrderStore } from '@/store/order';
import { useOrder } from '@/composables/useOrder';
import { useProductStore } from '@/store/productStore';
import DxpAppVersionInfo from '@/components/DxpAppVersionInfo.vue';
import { useAuth } from '@/composables/auth'
import router from '@/router';

const appInfo = ref(import.meta.env.VITE_VERSION_INFO ? JSON.parse(import.meta.env.VITE_VERSION_INFO) : {} as any);
const appVersion = ref("");
const rerouteFulfillmentConfig = ref({
  allowDeliveryMethodUpdate: {},
  allowDeliveryAddressUpdate: {},
  allowPickupUpdate: {},
  allowCancel: {},
  shippingMethod: {},
  orderItemSplit: {}
} as any);
const carriers = ref([] as any);
const availableShipmentMethods = ref([] as any);
const rerouteFulfillmentConfigMapping = ref(import.meta.env.VITE_RF_CNFG_MPNG ? JSON.parse(import.meta.env.VITE_RF_CNFG_MPNG) : {} as any);

const userProfile = computed(() => useUserStore().getUserProfile);
const currentEComStore = computed(() => useProductStore().getCurrentEComStore);
const isPartialOrderRejectionEnabled = computed(() => useProductStore().isPartialOrderRejectionEnabled);
const isTrackingEnabled = computed(() => useProductStore().isTrackingEnabled);
const isPrintPackingSlipEnabled = computed(() => useProductStore().isPrintPackingSlipEnabled);
const isPrintPicklistsEnabled = computed(() => useProductStore().isPrintPicklistsEnabled);
const isShowShippingOrdersEnabled = computed(() => useProductStore().isShowShippingOrdersEnabled);
const isRequestTransferEnabled = computed(() => useProductStore().isRequestTransferEnabled);
const isHandoverProofEnabled = computed(() => useProductStore().isHandoverProofEnabled);

const firebaseDeviceId = computed(() => useNotificationStore().getFirebaseDeviceId);
const notificationPrefs = computed(() => useNotificationStore().getNotificationPrefs);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);
const currentFacility = computed(() => useProductStore().getCurrentFacility);

onMounted(() => {
  appVersion.value = appInfo.value.branch ? (appInfo.value.branch + "-" + appInfo.value.revision) : appInfo.value.tag;
});

onIonViewWillEnter(async () => {
  // Clearing the current order as to correctly display the selected segment when moving to list page
  useOrderStore().updateCurrent({ order: {} })
  
  // Only fetch configuration when environment mapping exists
  if (Object.keys(rerouteFulfillmentConfigMapping.value).length > 0) {
    fetchCarriers()
    getAvailableShipmentMethods();
    getRerouteFulfillmentConfiguration();
  }

  // fetching partial order rejection when entering setting page to have latest information
  await useProductStore().fetchProductStoreSettings(currentEComStore.value.productStoreId)

  // as notification prefs can also be updated from the notification pref modal,
  // latest state is fetched each time we open the settings page
  await useNotificationStore().fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userLoginId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), (currentFacility.value as any)?.facilityId, enumId))
});

async function fetchFacilityDependencies(facility: any) {
  const previousEComStoreId = currentEComStore.value.productStoreId
  await useProductStore().fetchProductStores(facility.facilityId)

  if (previousEComStoreId !== (currentEComStore.value as any).productStoreId) {
    await useProductStore().fetchEComStoreDependencies(currentEComStore.value.productStoreId)
    if (Object.keys(rerouteFulfillmentConfigMapping.value).length > 0) {
      getAvailableShipmentMethods();
      getRerouteFulfillmentConfiguration();
    }
  }
  await useNotificationStore().fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userLoginId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), (currentFacility.value as any)?.facilityId, enumId))
}

async function timeZoneUpdated(tzId: string) {
  await useUserStore().setUserTimeZone(tzId)
}


async function logout() {
  // remove firebase notification registration token -
  // OMS and auth is required hence, removing it before logout (clearing state)
  try {
    await useNotificationStore().unsubscribeTopic(firebaseDeviceId.value, import.meta.env.VITE_NOTIF_APP_ID)
  } catch (error) {
    logger.error(error)
  }

  // clear facility lat lon and stores information state when facility changes
  useProductStore().clearCurrentFacilityLatLon()
  useProductStore().clearStoresInformation()
  // Note: clearDeviceId was in util actions but I didn't see it in my migration. 
  // Checking if I missed it.
  
  useAuth().logout({ isUserUnauthorised: false }).then((redirectionUrl) => {
    // redirectionUrl is only present when SSO enables, thus when not present redirect user to login
    if(!redirectionUrl) {
      router.replace("/login");
    } else {
      window.location.href = redirectionUrl
    }
  })
}

function goToLaunchpad() {
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}`
}

function setBopisProductStoreSettings(ev: any, enumId: any, value: any) {
  ev.stopImmediatePropagation();
  useProductStore().setProductStoreSetting(currentEComStore.value?.productStoreId, enumId, (value ? "Y" : "N"))
}

async function openEditShipmentMethodModal(config: any) {
  const editShipmentMethodModal = await modalController.create({
    component: EditShipmentMethodModal,
    componentProps: { currentcConfig: getShipmentMethodConfig(), carriers: carriers.value, availableShipmentMethods: availableShipmentMethods.value }
  });

  editShipmentMethodModal.onDidDismiss().then(async (result: any) => {
    if (result.data?.shippingMethod) {
      await updateRerouteFulfillmentConfiguration(config, result.data?.shippingMethod)
    }
  })

  return editShipmentMethodModal.present();
}

function getShipmentMethodConfig() {
  if (Object.keys(rerouteFulfillmentConfig.value.shippingMethod).length !== 0) {
    try {
      const shippingMethodConfig = rerouteFulfillmentConfig.value.shippingMethod.settingValue ? JSON.parse(rerouteFulfillmentConfig.value.shippingMethod.settingValue) : {};
      if (Object.keys(shippingMethodConfig).length > 0) {
        const shipmentMethodDesc = availableShipmentMethods.value.find((shipmentMethod: any) => shipmentMethod.shipmentMethodTypeId === shippingMethodConfig.shipmentMethodTypeId)?.description;
        const carrierName = carriers.value.find((carrier: any) => carrier.partyId === shippingMethodConfig.carrierPartyId)?.groupName;
        return { ...shippingMethodConfig, shipmentMethodDesc, carrierName };
      }
    } catch (error) {
      console.error('Error parsing shipping method config:', error);
      return {};
    }
  }
  return {};
}

async function fetchCarriers() {
  availableShipmentMethods.value = [];
  try {
    const resp = await useOrder().getRerouteFulfillmentConfig({
      "entityName": "CarrierShipmentMethodCount",
      "inputFields": {
        "roleTypeId": "CARRIER",
        "partyTypeId": "PARTY_GROUP"
      },
      "fieldList": ["partyId", "roleTypeId", "groupName"],
      "viewIndex": 0,
      "viewSize": 250,
      "distinct": "Y",
      "noConditionFind": "Y",
      "orderBy": "groupName"
    }) as any;
    if (!commonUtil.hasError(resp) && resp.data?.docs) {
      carriers.value = resp.data.docs;
    }
  } catch (err) {
    logger.error(err)
  }
}

async function getAvailableShipmentMethods() {
  availableShipmentMethods.value = [];
  try {
    const resp = await useOrder().getRerouteFulfillmentConfig({
      "inputFields": {
        "productStoreId": currentEComStore.value?.productStoreId,
        "shipmentMethodTypeId": "STOREPICKUP",
        "shipmentMethodTypeId_op": "notEqual"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreShipmentMethView",
      "fieldList": ["productStoreShipMethId", "partyId", "shipmentMethodTypeId", "description"],
      "viewSize": 250
    }) as any;
    if (!commonUtil.hasError(resp) && resp.data?.docs) {
      availableShipmentMethods.value = resp.data.docs;
    }
  } catch (err) {
    logger.error(err)
  }
}

async function getRerouteFulfillmentConfiguration(settingTypeEnumId?: any) {
  try {
    const payload = {
      "inputFields": {
        "productStoreId": currentEComStore.value?.productStoreId,
        settingTypeEnumId
      },
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingTypeEnumId", "settingValue"],
      "viewSize": 5
    } as any

    // get all values
    if (!payload.inputFields.settingTypeEnumId) {
      payload.inputFields.settingTypeEnumId = Object.values(rerouteFulfillmentConfigMapping.value);
      payload.inputFields.settingTypeEnumId_op = "in"
      payload.viewSize = Object.values(rerouteFulfillmentConfigMapping.value)?.length
    }

    const resp = await useOrder().getRerouteFulfillmentConfig(payload) as any
    if (!commonUtil.hasError(resp) && resp.data?.docs) {
      const rerouteFulfillmentConfigMappingFlipped = Object.fromEntries(Object.entries(rerouteFulfillmentConfigMapping.value).map(([key, value]) => [value, key])) as any;
      resp.data.docs.map((config: any) => {
        rerouteFulfillmentConfig.value[rerouteFulfillmentConfigMappingFlipped[config.settingTypeEnumId]] = config;
      })
    } else {
      Object.keys(rerouteFulfillmentConfigMapping.value).map((key) => {
        rerouteFulfillmentConfig.value[key] = {};
      });
    }
  } catch (err) {
    logger.error(err)
    Object.keys(rerouteFulfillmentConfigMapping.value).map((key) => {
      rerouteFulfillmentConfig.value[key] = {};
    });
  }
}

async function updateRerouteFulfillmentConfiguration(config: any, value: any) {
  const params = {
    "productStoreId": currentEComStore.value?.productStoreId,
    "settingTypeEnumId": config.settingTypeEnumId,
    "settingValue": value
  }

  try {
    const resp = await useProductStore().updateRerouteFulfillmentConfig(params) as any
    if (!commonUtil.hasError(resp)) {
      commonUtil.showToast(translate('Configuration updated'))
    } else {
      commonUtil.showToast(translate('Failed to update configuration'))
    }
  } catch (err) {
    commonUtil.showToast(translate('Failed to update configuration'))
    logger.error(err)
  }
  // Fetch the updated configuration
  await getRerouteFulfillmentConfiguration(config.settingTypeEnumId);
}

async function updateNotificationPref(enumId: string) {
  let isToggledOn = false;
  const notificationStore = useNotificationStore();

  try {
    if (!firebaseMessaging.isFcmConfigured(import.meta.env.VITE_FIREBASE_CONFIG)) {
      logger.error("FCM is not configured.");
      commonUtil.showToast(translate('Notification preferences not updated. Please try again.'))
      return;
    }

    emitter.emit('presentLoader', { backdropDismiss: false })
    const facilityId = (currentFacility.value as any)?.facilityId
    const topicName = firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), facilityId, enumId)

    const pref = notificationPrefs.value.find((p: any) => p.enumId === enumId)
    pref.isEnabled
      ? await notificationStore.unsubscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID)
      : await notificationStore.subscribeTopic(topicName, import.meta.env.VITE_NOTIF_APP_ID)

    isToggledOn = !pref.isEnabled
    pref.isEnabled = !pref.isEnabled
    notificationStore.setNotificationPrefs(notificationPrefs.value)
    commonUtil.showToast(translate('Notification preferences updated.'))
  } catch (error) {
    commonUtil.showToast(translate('Notification preferences not updated. Please try again.'))
  } finally {
    emitter.emit("dismissLoader")
  }

  try {
    if (!allNotificationPrefs.value.length && isToggledOn) {
      await firebaseMessaging.initialiseFirebaseApp(
        JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}'),
        import.meta.env.VITE_FIREBASE_VAPID_KEY,
        async (token: string) => {
          await notificationStore.storeClientRegistrationToken(token, firebaseMessaging.generateDeviceId(notificationStore.getFirebaseDeviceId), import.meta.env.VITE_NOTIF_APP_ID);
        },
        (notification: any) => {
          notificationStore.addNotification(notification);
        }
      );
    } else if (allNotificationPrefs.value.length == 1 && !isToggledOn) {
      await notificationStore.unsubscribeTopic(firebaseDeviceId.value, import.meta.env.VITE_NOTIF_APP_ID)
    }
    await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userLoginId);
  } catch (error) {
    logger.error(error);
  }
}

async function confirmNotificationPrefUpdate(enumId: string, event: CustomEvent) {
  event.stopImmediatePropagation();

  const message = translate("Are you sure you want to update the notification preferences?");
  const alert = await alertController.create({
    header: translate("Update notification preferences"),
    message,
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Confirm"),
        handler: async () => {
          // passing event reference for updation in case the API success
          alertController.dismiss()
          await updateNotificationPref(enumId)
        }
      }
    ],
  });
  return alert.present();
}
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
  ion-content {
    --padding-bottom: 80px;
  }
</style>
