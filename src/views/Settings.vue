<template>
  <ion-page>
    <ion-header>
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
              <p class="overline">{{ sessionTimeLeft }}</p>
              <ion-card-subtitle>{{ userProfile?.username }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.userFullName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button data-testid="logout-button" v-if="!commonUtil.isAppEmbedded()" color="danger" @click="logout()">{{ translate("Logout") }}</ion-button>
          <ion-button v-if="!commonUtil.isAppEmbedded()" :standalone-hidden="!useUserStore().hasPermission(Actions.APP_PWA_STANDALONE_ACCESS)" fill="outline" @click="goToLaunchpad()">
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
        <DxpOmsInstanceNavigator :is-embedded="commonUtil.isAppEmbedded()" :has-oms-access="useUserStore().hasPermission(Actions.APP_COMMERCE_VIEW)"/>
        <div data-testid="facility-switcher">
          <DxpFacilitySwitcher @updateFacility="fetchFacilityDependencies" />
        </div>
        <!-- <ion-card>
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
            <ion-toggle data-testid="delivery-method-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" :checked="isRerouteSettingEnabled('CUST_DLVRMTHD_UPDATE')" @click.prevent="setBopisProductStoreSettings($event, 'CUST_DLVRMTHD_UPDATE')">{{ translate("Delivery method") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle data-testid="delivery-address-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" :checked="isRerouteSettingEnabled('CUST_DLVRADR_UPDATE')" @click.prevent="setBopisProductStoreSettings($event, 'CUST_DLVRADR_UPDATE')">{{ translate("Delivery address") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle data-testid="pickup-location-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" :checked="isRerouteSettingEnabled('CUST_PCKUP_UPDATE')" @click.prevent="setBopisProductStoreSettings($event, 'CUST_PCKUP_UPDATE')">{{ translate("Pick up location") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <p>Uploading order cancelations to Shopify is currently disabled. Order cancelations in HotWax will not be synced to Shopify.</p>
            <ion-toggle data-testid="cancel-order-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" :checked="isRerouteSettingEnabled('CUST_ALLOW_CNCL')" @click.prevent="setBopisProductStoreSettings($event, 'CUST_ALLOW_CNCL')">{{ translate("Cancel order before fulfillment") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-toggle data-testid="order-item-split-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" :checked="isRerouteSettingEnabled('CUST_ORD_ITEM_SPLIT')" @click.prevent="setBopisProductStoreSettings($event, 'CUST_ORD_ITEM_SPLIT')">{{ translate("Order item split") }}</ion-toggle>
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
            <ion-button slot="end" fill="outline" color="dark" :disabled="!useUserStore().hasPermission(Actions.APP_RF_CONFIG_UPDATE)" @click="openEditShipmentMethodModal()">{{ Object.keys(getShipmentMethodConfig()).length > 0 ? translate('Edit') : translate('Add')}}</ion-button>
          </ion-item>
        </ion-card> -->

        <!-- <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Partial Order rejection") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Specify whether you reject a BOPIS order partially when any order item inventory is insufficient at the store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle data-testid="partial-rejection-toggle" label-placement="start" :disabled="!useUserStore().hasPermission(Actions.APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE)" :checked="isProductStoreSettingEnabled('BOPIS_PART_ODR_REJ')" @click.prevent="setBopisProductStoreSettings($event, 'BOPIS_PART_ODR_REJ')">{{ translate("Allow partial rejection") }}</ion-toggle>
          </ion-item>
        </ion-card> -->
        
      </section>

      <hr />
      <DxpAppVersionInfo/>

      <section>
        <DxpProductIdentifier v-if="useUserStore().hasPermission(Actions.APP_ADMIN_ACCESS)" />
        <DxpTimeZoneSwitcher v-if="useUserStore().hasPermission(Actions.APP_ADMIN_ACCESS)" @timeZoneUpdated="timeZoneUpdated" />
        <!-- <DxpLanguageSwitcher /> -->

        <ion-card v-if="useUserStore().hasPermission(Actions.APP_ADMIN_ACCESS)">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Enabling this will show only shipping orders and hide all pickup orders.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission(Actions.APP_SHOW_SHIPPING_ORD_PREF_UPDATE)">
            <ion-toggle data-testid="show-shipping-orders-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('SHOW_SHIPPING_ORDERS')" @click.prevent="setBopisProductStoreSettings($event, 'SHOW_SHIPPING_ORDERS')">{{ translate("Show shipping orders") }}</ion-toggle>
          </ion-item>
        </ion-card>

        <!-- <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Packing Slip") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Packing slips help customer reconcile their order against the delivered items.') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission(Actions.APP_PRINT_PACKING_SLIP_PREF_UPDATE)">
            <ion-toggle data-testid="generate-packing-slips-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('PRINT_PACKING_SLIPS')" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PACKING_SLIPS')">{{ translate("Generate packing slips") }}</ion-toggle>
          </ion-item>
        </ion-card> -->

        <!-- <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Track Pickers") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Track who picked orders by entering picker IDs when packing an order.') }}
          </ion-card-content>
          <ion-item :disabled="!useUserStore().hasPermission(Actions.APP_ENABLE_TRACKING_PREF_UPDATE)">
            <ion-toggle data-testid="enable-tracking-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('ENABLE_TRACKING')" @click.prevent="setBopisProductStoreSettings($event, 'ENABLE_TRACKING')">{{ translate("Enable tracking") }}</ion-toggle>
          </ion-item>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission(Actions.APP_PRINT_PICKLIST_PREF_UPDATE)">
            <ion-toggle data-testid="print-picklists-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('PRINT_PICKLISTS')" @click.prevent="setBopisProductStoreSettings($event, 'PRINT_PICKLISTS')">{{ translate("Print picklists") }}</ion-toggle>
          </ion-item> 
        </ion-card> -->

        <!-- <ion-card v-if="useUserStore().hasPermission(Actions.APP_REQUEST_TRANSFER_UPDATE)">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Request Transfer") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This will allow store associates to request the item from another store when it is not available in their current stock') }}
          </ion-card-content>
          <ion-item lines="none" :disabled="!useUserStore().hasPermission(Actions.APP_REQUEST_TRANSFER_UPDATE)">
            <ion-toggle data-testid="request-transfer-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('REQUEST_TRANSFER')" @click.prevent="setBopisProductStoreSettings($event, 'REQUEST_TRANSFER')">{{ translate("Show Request Transfer") }}</ion-toggle>
          </ion-item>
        </ion-card> -->

        <!-- <ion-card v-if="useUserStore().hasPermission(Actions.APP_PROOF_OF_DELIVERY_PREF_UPDATE)">
          <ion-card-header>
            <ion-card-title>
              {{ translate("Proof of delivery") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('This will allow store associates to verify the delivery of pickup order') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-toggle data-testid="proof-of-delivery-toggle" label-placement="start" :checked="isProductStoreSettingEnabled('HANDOVER_PROOF')" @click.prevent="setBopisProductStoreSettings($event, 'HANDOVER_PROOF')">{{ translate("Show proof of delivery") }}</ion-toggle>
          </ion-item>
        </ion-card> -->

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

          <!--
            The permission prompt only appears from a real tap, so this is the one place it can be
            asked for. The same tap also has to finish the job — active push worker, token, device row
            on the server — and it has to stay available while any of those is missing: a device that
            was granted but never registered is exactly the one that needs it, and it is the state the
            client hit in testing while everything on screen said "allowed".
          -->
          <template v-if="notificationPermission === 'default' || (notificationPermission === 'granted' && isDeviceRegistered === false)">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p v-if="notificationPermission === 'default'">{{ translate("This device has not been allowed to show notifications yet.") }}</p>
                <p v-else>{{ translate("Notifications are allowed, but this device is not registered to receive them yet.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-button fill="outline" :disabled="isEnablingNotifications" @click="enableNotificationsOnThisDevice()">
                {{ translate(notificationPermission === 'default' ? "Allow notifications on this device" : "Finish setting up notifications on this device") }}
              </ion-button>
            </ion-item>
          </template>

          <!-- Recovery differs by platform: iOS will not re-prompt at all, browsers reset in site settings. -->
          <ion-item v-else-if="notificationPermission === 'denied'" lines="none">
            <ion-label class="ion-text-wrap">
              <p v-if="isApplePlatform">{{ translate("Notifications are blocked for this app. The app must be removed from the Home Screen and added again before it can ask a second time.") }}</p>
              <p v-else>{{ translate("Notifications are blocked for this site. Reset the notification permission for it in your browser settings, then reload.") }}</p>
            </ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Notification diagnostics") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate('Check why notifications are not arriving on this device, and register it from here.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-button fill="outline" :disabled="isSendingTestNotification" @click="confirmSendTestNotification()">
              <ion-spinner v-if="isSendingTestNotification" slot="start" name="crescent" />
              {{ translate(isSendingTestNotification ? "Waiting for it to arrive" : "Send a test order notification") }}
            </ion-button>
            <ion-button fill="outline" @click="openNotificationDiagnostics()">{{ translate("Open diagnostics") }}</ion-button>
            <ion-button fill="outline" @click="openLogs()">{{ translate("Open logs") }}</ion-button>
          </ion-item>
        </ion-card>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ translate("Test Print") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button @click="testPrint()">{{ translate("Print") }}</ion-button>
          </ion-card-content>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonSpinner, IonTitle, IonToggle, IonToolbar, modalController, onIonViewDidLeave, onIonViewWillEnter } from '@ionic/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { openOutline } from 'ionicons/icons'
import { DateTime, Duration } from 'luxon';
import Image from '@/components/Image.vue';

import { commonUtil, emitter, firebaseMessaging, logger, translate, useNotificationStore } from '@common';
import { useAuth } from "@common/composables/useAuth";
import EditShipmentMethodModal from '@/components/EditShipmentMethodModal.vue';
import NotificationDiagnosticsModal from '@/components/NotificationDiagnosticsModal.vue';
import LogsModal from '@/components/LogsModal.vue';
import DxpTimeZoneSwitcher from "@/components/DxpTimeZoneSwitcher.vue"
import DxpOmsInstanceNavigator from "@/components/DxpOmsInstanceNavigator.vue";
import DxpProductIdentifier from "@/components/DxpProductIdentifier.vue";
import DxpLanguageSwitcher from "@/components/DxpLanguageSwitcher.vue";
import DxpFacilitySwitcher from "@/components/DxpFacilitySwitcher.vue";

import { useEposPrinter } from "@/composables/useEposPrinter";
import { useUserStore } from '@/store/user';
import { useOrderStore } from '@/store/order';
import { useProductStore } from '@/store/productStore';
import DxpAppVersionInfo from '@/components/DxpAppVersionInfo.vue';
import { firebaseUtil } from "@/utils/firebaseUtil"
import { sendTestOrderNotification } from "@/utils/liveNotificationTest"
import Actions from "@/authorization/actions"

const appInfo = ref(import.meta.env.VITE_VERSION_INFO ? JSON.parse(import.meta.env.VITE_VERSION_INFO) : {} as any);
const appVersion = ref("");

const carriers = computed(() => useProductStore().getCarriers);
const availableShipmentMethods = computed(() => useProductStore().getAvailableShipmentMethods);

const userProfile = computed(() => useUserStore().getUserProfile);
const currentProductStore = computed(() => useProductStore().getCurrentProductStore);
const isProductStoreSettingEnabled = computed(() => useProductStore().isProductStoreSettingEnabled);
const isRerouteSettingEnabled = computed(() => useProductStore().isRerouteSettingEnabled);

const notificationPermission = ref(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
const isEnablingNotifications = ref(false);
const isApplePlatform = firebaseUtil.isApplePushPlatform();
// null until checked: the button must not flash for a device that turns out to be fine.
const isDeviceRegistered = ref<boolean | null>(null);

const firebaseDeviceId = computed(() => useNotificationStore().getFirebaseDeviceId);
const notificationPrefs = computed(() => useNotificationStore().getNotificationPrefs);
const allNotificationPrefs = computed(() => useNotificationStore().getAllNotificationPrefs);
const currentFacility = computed(() => useProductStore().getCurrentFacility);

// Session expiry shown to the associate. The source is the expirationTime the OMS issued
// (read through getTokenExpiration so the embedded Shopify value wins when the app runs
// inside admin), which is the same number isAuthenticated uses to end the session.
const sessionExpiresAt = computed(() => Number(commonUtil.getTokenExpiration()) || 0);

// Driven off the wall clock rather than a decrementing counter: an installed PWA gets
// suspended for hours and its timers throttled, so on resume this shows the real remaining
// time instead of however far the counter happened to get.
const currentTime = ref(DateTime.now().toMillis());
let sessionTimer: ReturnType<typeof setInterval> | null = null;

const sessionTimeLeft = computed(() => {
  if (!sessionExpiresAt.value) return "";

  const remaining = sessionExpiresAt.value - currentTime.value;
  if (remaining <= 0) return translate("Session expired");

  const duration = Duration.fromMillis(remaining).shiftTo("days", "hours", "minutes", "seconds");
  return duration.days > 0 ? duration.toFormat("d'd' hh:mm:ss") : duration.toFormat("hh:mm:ss");
});

const stopSessionTimer = () => {
  if (!sessionTimer) return;
  clearInterval(sessionTimer);
  sessionTimer = null;
};

const startSessionTimer = () => {
  // Settings is a tab child and Ionic keeps it mounted, so the timer is tied to view
  // enter/leave instead of mount/unmount - otherwise it keeps ticking on other tabs.
  stopSessionTimer();
  currentTime.value = DateTime.now().toMillis();
  sessionTimer = setInterval(() => {
    currentTime.value = DateTime.now().toMillis();
  }, 1000);
};

onMounted(() => {
  appVersion.value = import.meta.env.VITE_APP_BUILD ? import.meta.env.VITE_APP_BUILD : appInfo.value.branch ? (appInfo.value.branch + "-" + appInfo.value.revision) : appInfo.value.tag;
  appVersion.value = appInfo.value.branch ? (appInfo.value.branch + "-" + appInfo.value.revision) : appInfo.value.tag;
});

onIonViewDidLeave(() => {
  stopSessionTimer();
});

onUnmounted(() => {
  stopSessionTimer();
});

onIonViewWillEnter(async () => {
  startSessionTimer();

  // Permission can change outside this screen (system settings, the diagnostics modal),
  // so re-read it on entry rather than trusting the value captured at setup.
  notificationPermission.value = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  // Permission alone is not the whole story: a device can be granted and still have no active push
  // worker or no confirmed token — so the facts are re-checked on entry too.
  isDeviceRegistered.value = await firebaseUtil.isDeviceSetUp();
  // Clearing the current order as to correctly display the selected segment when moving to list page
  useOrderStore().updateCurrent({ order: {} })
  
  // Only fetch configuration when environment mapping exists
  await useProductStore().fetchCarriers();
  await useProductStore().fetchProductStoreShipmentMethods(currentProductStore.value?.productStoreId);

  // fetching partial order rejection when entering setting page to have latest information
  await useProductStore().fetchProductStoreSettings(currentProductStore.value.productStoreId)

  // as notification prefs can also be updated from the notification pref modal,
  // latest state is fetched each time we open the settings page
  await useNotificationStore().fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), (currentFacility.value as any)?.facilityId, enumId), firebaseDeviceId.value)
});

async function fetchFacilityDependencies(facility: any) {
  const previousProductStoreId = currentProductStore.value.productStoreId
  await useProductStore().fetchProductStores(facility.facilityId)

  if (previousProductStoreId !== (currentProductStore.value as any).productStoreId) {
    await useProductStore().fetchProductStoreDependencies(currentProductStore.value.productStoreId)
    await useProductStore().fetchProductStoreShipmentMethods(currentProductStore.value?.productStoreId);
  }
  await useNotificationStore().fetchNotificationPreferences(import.meta.env.VITE_NOTIF_ENUM_TYPE_ID, import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userId, (enumId: string) => firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), (currentFacility.value as any)?.facilityId, enumId), firebaseDeviceId.value)
}

async function timeZoneUpdated(tzId: string) {
  await useUserStore().setUserTimeZone(tzId)
}


async function logout() {
  useAuth().logout({ isUserUnauthorised: false });
}

function goToLaunchpad() {
  window.location.href = `${import.meta.env.VITE_LOGIN_URL}`
}

function setBopisProductStoreSettings(ev: any, enumId: string) {
  ev.stopImmediatePropagation();
  const value = !useProductStore().isProductStoreSettingEnabled(enumId);

  useProductStore().setProductStoreSetting(currentProductStore.value?.productStoreId, enumId, (value ? "Y" : "N"))
}

async function openEditShipmentMethodModal() {
  const editShipmentMethodModal = await modalController.create({
    component: EditShipmentMethodModal,
    componentProps: { currentcConfig: getShipmentMethodConfig(), carriers: carriers.value, availableShipmentMethods: availableShipmentMethods.value }
  });

  editShipmentMethodModal.onDidDismiss().then(async (result: any) => {
    if (result.data?.shippingMethod) {
      await useProductStore().setProductStoreSetting(currentProductStore.value?.productStoreId, 'RF_SHIPPING_METHOD', result.data?.shippingMethod);
    }
  })

  return editShipmentMethodModal.present();
}

function getShipmentMethodConfig() {
  const shippingMethodConfig = useProductStore().getRerouteShipmentMethod;
  if (shippingMethodConfig && typeof shippingMethodConfig === 'object' && Object.keys(shippingMethodConfig).length > 0) {
    try {
      const shipmentMethodDesc = availableShipmentMethods.value.find((shipmentMethod: any) => shipmentMethod.shipmentMethodTypeId === shippingMethodConfig.shipmentMethodTypeId)?.description;
      const carrierName = carriers.value.find((carrier: any) => carrier.partyId === shippingMethodConfig.carrierPartyId)?.groupName;
      return { ...shippingMethodConfig, shipmentMethodDesc, carrierName };
    } catch (error) {
      console.error('Error parsing shipping method config:', error);
      return {};
    }
  } else if (typeof shippingMethodConfig === 'string' && shippingMethodConfig !== '') {
    return { shipmentMethodTypeId: shippingMethodConfig };
  }
  return {};
}

const isSendingTestNotification = ref(false);

/**
 * The backend publishes to the facility topic, so this is a real push to every device subscribed at
 * the store, not a private ping. Say so before firing it.
 */
async function confirmSendTestNotification() {
  const facilityName = (currentFacility.value as any)?.facilityName || translate("this facility");
  const alert = await alertController.create({
    header: translate("Send a test order notification?"),
    message: translate("This sends a real new-order notification to every device subscribed at", { facilityName }),
    buttons: [
      { text: translate("Cancel"), role: "cancel" },
      { text: translate("Send"), handler: () => { sendTestNotification(); } }
    ]
  });
  await alert.present();
}

async function sendTestNotification() {
  isSendingTestNotification.value = true;
  try {
    const result = await sendTestOrderNotification({ facilityId: (currentFacility.value as any)?.facilityId });
    if (result.ok) {
      commonUtil.showToast(translate("Received on this device after", { seconds: ((result.receivedAfterMs ?? 0) / 1000).toFixed(1), orderName: result.orderName || result.orderId }));
      return;
    }
    commonUtil.showToast(translate(LIVE_TEST_FAILURE_MESSAGE[result.failedStep ?? "send"], { detail: result.detail || "" }));
  } catch (error) {
    logger.error("Live notification test threw", error);
    commonUtil.showToast(translate("The test notification could not be sent."));
  } finally {
    isSendingTestNotification.value = false;
  }
}

// One message per link, so the toast says which half of the round trip failed.
const LIVE_TEST_FAILURE_MESSAGE: Record<string, string> = {
  device: "This device is not registered for notifications, so nothing was sent. Set it up above first.",
  order: "No open pickup order at this facility to send a notification for.",
  send: "The server refused to send the test notification.",
  receipt: "The server accepted it, but nothing reached this device. Open diagnostics."
};

async function openNotificationDiagnostics() {
  const diagnosticsModal = await modalController.create({
    component: NotificationDiagnosticsModal
  });
  return diagnosticsModal.present();
}

async function openLogs() {
  const logsModal = await modalController.create({
    component: LogsModal
  });
  return logsModal.present();
}

// One message per link in the chain, so the toast names what actually failed. Details land in
// the app logs and in the diagnostics screen; the toast only has to point there.
const SETUP_FAILURE_MESSAGE: Record<string, string> = {
  support: "Push notifications are not supported here. On iPad, add the app to the Home Screen and open it from there.",
  config: "Notifications are not configured for this build.",
  permission: "Notifications were not allowed on this device.",
  serviceWorker: "The notification service could not be installed on this device. Open diagnostics for details.",
  registration: "This device could not be registered for notifications. Open diagnostics for details.",
  verification: "Notification setup did not complete on this device. Open diagnostics for details."
};

/**
 * Ask for notification permission and finish registering the device — the whole chain.
 *
 * Runs from a tap on purpose: that is the only context in which iOS will show the prompt at all.
 * Login and app mount deliberately skip this, so this button is the sole path to a first grant.
 * Success is judged on the setup result, never on Notification.permission alone: a device can be
 * "granted" with no push worker and no token, and that is precisely the state that used to read
 * as "Notifications are now allowed" while receiving nothing.
 */
async function enableNotificationsOnThisDevice() {
  isEnablingNotifications.value = true;
  let result: Awaited<ReturnType<typeof firebaseUtil.setUpNotificationsOnThisDevice>> | undefined;
  try {
    result = await firebaseUtil.setUpNotificationsOnThisDevice({ userId: userProfile.value?.userId });
  } catch (error) {
    logger.error("Notification setup threw", error);
  } finally {
    notificationPermission.value = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
    isDeviceRegistered.value = result?.ok ?? await firebaseUtil.isDeviceSetUp();
    isEnablingNotifications.value = false;
  }

  if (result?.ok) {
    commonUtil.showToast(translate("Notifications are set up on this device."));
    return;
  }
  commonUtil.showToast(translate(SETUP_FAILURE_MESSAGE[result?.failedStep ?? "verification"]));
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
    commonUtil.showToast(translate('Notification preferences updated successfully, trigger notifications.'))
  } catch (error) {
    commonUtil.showToast(translate('Notification preferences not updated. Please try again.'))
  } finally {
    emitter.emit("dismissLoader")
  }

  try {
    /*
     * Only when permission is already granted. The subscribe above awaited a network round trip,
     * which ends the confirmation tap's transient activation, so a prompt raised here can still
     * be refused by iOS for exactly the reason this change exists to remove. A device that has
     * not granted yet is registered through the explicit allow action on this card, which runs
     * inside a fresh gesture.
     */
    if (!allNotificationPrefs.value.length && isToggledOn && firebaseUtil.canInitialiseWithoutPrompting()) {
      await firebaseUtil.initialiseFirebaseMessaging();
    } else if (allNotificationPrefs.value.length == 1 && !isToggledOn) {
      await notificationStore.removeClientRegistrationToken(firebaseDeviceId.value, import.meta.env.VITE_NOTIF_APP_ID)
    }
    await notificationStore.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, userProfile.value?.userId, firebaseDeviceId.value);
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

async function testPrint() {
  const printer = useEposPrinter().configFromEnv();

  if(!printer) {
    commonUtil.showToast(translate("No printer configured."))

    return;
  }

  try {
    await useEposPrinter().testPrint(printer);
    commonUtil.showToast(translate("Test print sent to printer."))
  } catch (err: any) {
    logger.error("Test print failed", err)
    commonUtil.showToast(err.message || translate("Could not print. Please check the printer."))
  }
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
