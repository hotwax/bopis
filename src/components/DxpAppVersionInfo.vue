<template>
  <div class="section-header">
    <div>
      <h1>{{ translate('App') }}</h1>
      <p class="overline">{{ translate("Version: ", { appVersion }) }}</p>
    </div>
    <div class="ion-text-end">
      <p class="overline">{{ translate("Built: ", { builtDateTime: getDateTime(appInfo.builtTime) }) }}</p>
      <!--
        Two distinct paths, deliberately not merged. `updateExists` is the service worker's own
        "a new worker is waiting" signal and is the cheapest possible update, so it wins when set.
        The manual check below covers the case the app currently has no answer for: this PWA is built
        with selfDestroying, so no worker ever waits and that button alone would never appear.
      -->
      <ion-button v-if="pwaState.updateExists" @click="refreshApp()" fill="outline" color="dark" size="small">{{ translate("Update") }}</ion-button>
      <ion-button v-else :disabled="isChecking" fill="outline" color="dark" size="small" @click="checkForUpdates()">
        <ion-spinner v-if="isChecking" slot="start" name="crescent" />
        {{ isChecking ? translate("Checking") : translate("Check for updates") }}
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonSpinner } from '@ionic/vue';
import { DateTime } from 'luxon';
import { commonUtil, logger, translate } from '@common';
import { useAuth } from '@common/composables/useAuth';
import { getCanonicalPath } from '@common/utils/appVersionUtil';
import { computed, ref } from 'vue';
import { useUserStore } from '@/store/user';
import { compareBuilds, fetchDeployedEntryScriptSrc, getLoadedEntryScriptSrc } from '@/utils/appUpdateUtil';

const userStore = useUserStore();
const { fetchAppVersion } = useAuth();

const pwaState = computed(() => userStore.pwaState)
const isChecking = ref(false)

const refreshApp = () => {
  userStore.updatePwaState({ registration: pwaState.value.registration, updateExists: false });
  if (!pwaState.value.registration || !pwaState.value.registration.waiting) return
  pwaState.value.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
}

/**
 * Pull the latest build on demand.
 *
 * Step 1 re-asks the OMS which version this deployment should run — the same call the app makes at
 * login, so the server stays the single source of truth. All this adds is that you no longer have to
 * log out to re-ask, which matters for an installed PWA that can hold a session for weeks.
 *
 * Step 2 covers what a version comparison cannot see: the release workflow republishes the same vX.Y.Z
 * tree on every run, so the version string can be identical while the assets are not.
 */
const checkForUpdates = async () => {
  if (isChecking.value) return
  isChecking.value = true

  try {
    await fetchAppVersion()

    // fetchAppVersion applies the OMS's answer to the URL itself. When a redirect is pending this tab
    // is already navigating to another version, so stop rather than racing that with a reload.
    if (getCanonicalPath(userStore.appVersion ?? "", window.location.pathname) !== null) return

    const deployedEntry = await fetchDeployedEntryScriptSrc(import.meta.env.BASE_URL || "/")
    const comparison = compareBuilds(getLoadedEntryScriptSrc(document), deployedEntry)

    if (comparison === "up-to-date") {
      commonUtil.showToast(translate("You are on the latest version"))
      return
    }

    // "unknown" means one of the two bundle names could not be read, not that the app is current, so it
    // reloads too. index.html is served no-cache, so the cost is one revalidated request and the worst
    // case is a reload that changes nothing — better than reporting "up to date" without establishing it.
    commonUtil.showToast(translate("Updating to the latest version"))
    window.location.reload()
  } catch (error) {
    logger.error(error)
    commonUtil.showToast(translate("Could not check for updates"))
  } finally {
    isChecking.value = false
  }
}

const appInfo = (import.meta.env.VITE_APP_VERSION_INFO ? JSON.parse(import.meta.env.VITE_APP_VERSION_INFO as string) : {}) as any;
const appVersion = appInfo.branch ? (appInfo.branch + "-" + appInfo.revision) : appInfo.tag ? appInfo.tag : "";
const getDateTime = (time: any) => time ? DateTime.fromMillis(time).setZone(userStore.currentTimeZoneId).toLocaleString(DateTime.DATETIME_MED) : "";
</script>
