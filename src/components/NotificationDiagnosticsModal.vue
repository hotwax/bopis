<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Notification diagnostics") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="refresh">
          <ion-icon slot="icon-only" :icon="refreshOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ translate("Verdict") }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p v-for="(line, index) in verdict" :key="index" class="verdict-line">
          <ion-icon :icon="line.ok ? checkmarkCircleOutline : (line.warn ? alertCircleOutline : closeCircleOutline)"
            :color="line.ok ? 'success' : (line.warn ? 'warning' : 'danger')" />
          <span>{{ line.text }}</span>
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ translate("Actions") }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        {{ translate("Run these on the device that is not receiving notifications. Each step reports its own result.") }}
      </ion-card-content>
      <ion-list>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" :disabled="isBusy" @click="registerDevice">
            {{ translate("Request permission and register this device") }}
          </ion-button>
        </ion-item>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" :disabled="isBusy" @click="showLocalTestNotification">
            {{ translate("Show a local test notification") }}
          </ion-button>
        </ion-item>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" color="warning" :disabled="isBusy" @click="resubscribeTopics">
            {{ translate("Re-subscribe topics for this device") }}
          </ion-button>
        </ion-item>
        <ion-item lines="none">
          <ion-button expand="block" fill="outline" color="medium" :disabled="isBusy" @click="copyReport">
            {{ translate("Copy full report") }}
          </ion-button>
        </ion-item>
      </ion-list>
      <ion-card-content v-if="steps.length">
        <p v-for="(step, index) in steps" :key="index" class="verdict-line">
          <ion-icon :icon="step.ok ? checkmarkCircleOutline : closeCircleOutline"
            :color="step.ok ? 'success' : 'danger'" />
          <span>{{ step.label }}<template v-if="step.detail"> — {{ step.detail }}</template></span>
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card v-for="group in groups" :key="group.title">
      <ion-card-header>
        <ion-card-title>{{ group.title }}</ion-card-title>
      </ion-card-header>
      <ion-list>
        <ion-item v-for="row in group.rows" :key="row.label" lines="full">
          <ion-label>
            <p>{{ row.label }}</p>
            <h3 class="value">{{ row.value }}</h3>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-card>
  </ion-content>
</template>

<script setup lang="ts">
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent,
  IonHeader, IonIcon, IonItem, IonLabel, IonList, IonTitle, IonToolbar, modalController
} from "@ionic/vue";
import { computed, onMounted, ref } from "vue";
import {
  alertCircleOutline, checkmarkCircleOutline, closeCircleOutline, closeOutline, refreshOutline
} from "ionicons/icons";
import { api, commonUtil, firebaseMessaging, logger, translate, useNotificationStore } from "@common";
import { useUserStore } from "@/store/user";
import { useProductStore } from "@/store/productStore";

type Row = { label: string; value: string };
type Step = { label: string; ok: boolean; detail?: string };

const isBusy = ref(false);
const steps = ref<Step[]>([]);

const env = ref({ hasConfig: false, projectId: "-", hasVapid: false });
const platform = ref({ standalone: "-", userAgent: "-", iosVersion: "-" });
const support = ref({ fcmSupported: "-", notificationApi: false, serviceWorkerApi: false, pushManagerApi: false, permission: "-" });
const workers = ref<Row[]>([]);
const pushSub = ref({ exists: "-", endpointHost: "-" });

const appState = computed(() => {
  const store = useNotificationStore();
  const facility: any = useProductStore().getCurrentFacility;
  const profile: any = useUserStore().getUserProfile;
  return {
    isFirebaseInitialised: String(store.isFirebaseInitialised),
    firebaseDeviceId: store.getFirebaseDeviceId || "(none)",
    subscribedTopicCount: String(store.getAllNotificationPrefs?.length ?? 0),
    omsInstanceName: commonUtil.getOMSInstanceName() || "(unknown)",
    facilityId: facility?.facilityId || "(none)",
    userId: profile?.userId || "(none)",
    appId: import.meta.env.VITE_NOTIF_APP_ID || "(unset)"
  };
});

const expectedTopics = computed(() => {
  const store = useNotificationStore();
  const facility: any = useProductStore().getCurrentFacility;
  const oms = commonUtil.getOMSInstanceName();
  const prefs = store.getNotificationPrefs || [];
  if (!prefs.length) return [{ label: "Expected topics", value: "(no preferences loaded)" }];
  return prefs.map((pref: any) => ({
    label: `${pref.enumId}${pref.isEnabled ? " (on)" : " (off)"}`,
    value: firebaseMessaging.generateTopicName(oms, facility?.facilityId, pref.enumId)
  }));
});

const subscribedTopics = computed(() => {
  const all = useNotificationStore().getAllNotificationPrefs || [];
  if (!all.length) return [{ label: "Server-side subscriptions", value: "(none) — backend has no topic for this user" }];
  return all.map((pref: any, index: number) => ({
    label: `Subscription ${index + 1}`,
    value: pref?.topic || JSON.stringify(pref)
  }));
});

const verdict = computed(() => {
  const out: { text: string; ok: boolean; warn?: boolean }[] = [];
  const state = appState.value;

  if (platform.value.standalone === "false") {
    out.push({ text: "Opened in a browser tab, not the Home Screen app. On iOS, push only works from the installed Home Screen app.", ok: false });
  } else if (platform.value.standalone === "true") {
    out.push({ text: "Running as an installed Home Screen app.", ok: true });
  }

  if (support.value.fcmSupported === "false") {
    out.push({ text: "Firebase reports push is NOT supported in this context.", ok: false });
  } else if (support.value.fcmSupported === "true") {
    out.push({ text: "Firebase reports push is supported here.", ok: true });
  }

  if (support.value.permission === "denied") {
    out.push({ text: "Notification permission is DENIED. iOS will not re-prompt; the Home Screen app must be deleted and re-added.", ok: false });
  } else if (support.value.permission === "default") {
    out.push({ text: "Permission not yet requested. Use the register button below, which asks from a real tap.", ok: false, warn: true });
  } else if (support.value.permission === "granted") {
    out.push({ text: "Notification permission is granted.", ok: true });
  }

  if (!env.value.hasConfig) out.push({ text: "Firebase config is missing from this build.", ok: false });
  if (!env.value.hasVapid) out.push({ text: "VAPID key is missing from this build.", ok: false });

  if (state.isFirebaseInitialised === "true" && state.firebaseDeviceId === "(none)") {
    out.push({ text: "App thinks Firebase is already initialised but holds no device id, so it will skip registering. Use the register button to force it.", ok: false });
  }

  if (state.firebaseDeviceId === "(none)") {
    out.push({ text: "No device id stored, so no token was ever sent to the backend.", ok: false });
  } else {
    out.push({ text: `Device id ${state.firebaseDeviceId} stored locally. Backend must show a token for it.`, ok: true });
  }

  if (state.subscribedTopicCount === "0") {
    out.push({ text: "No server-side topic subscriptions for this user, so nothing would be delivered even with a valid token.", ok: false });
  } else {
    out.push({ text: `${state.subscribedTopicCount} server-side topic subscription(s) found.`, ok: true });
  }

  if (pushSub.value.exists === "false") {
    out.push({ text: "Browser has no push subscription. The token handshake never completed on this device.", ok: false });
  } else if (pushSub.value.exists === "true") {
    out.push({ text: `Browser push subscription exists (${pushSub.value.endpointHost}).`, ok: true });
  }

  return out;
});

const groups = computed(() => [
  {
    title: translate("Install context"),
    rows: [
      { label: "Installed Home Screen app (standalone)", value: platform.value.standalone },
      { label: "iOS version", value: platform.value.iosVersion },
      { label: "User agent", value: platform.value.userAgent }
    ]
  },
  {
    title: translate("Push support"),
    rows: [
      { label: "Firebase isSupported()", value: support.value.fcmSupported },
      { label: "Notification permission", value: support.value.permission },
      { label: "Notification API", value: String(support.value.notificationApi) },
      { label: "ServiceWorker API", value: String(support.value.serviceWorkerApi) },
      { label: "PushManager API", value: String(support.value.pushManagerApi) }
    ]
  },
  {
    title: translate("Build config"),
    rows: [
      { label: "Firebase config present", value: String(env.value.hasConfig) },
      { label: "Firebase projectId", value: env.value.projectId },
      { label: "VAPID key present", value: String(env.value.hasVapid) }
    ]
  },
  {
    title: translate("App state"),
    rows: [
      { label: "isFirebaseInitialised (persisted)", value: appState.value.isFirebaseInitialised },
      { label: "Device id", value: appState.value.firebaseDeviceId },
      { label: "OMS instance name", value: appState.value.omsInstanceName },
      { label: "Facility", value: appState.value.facilityId },
      { label: "User", value: appState.value.userId },
      { label: "Notification app id", value: appState.value.appId }
    ]
  },
  { title: translate("Service workers"), rows: workers.value.length ? workers.value : [{ label: "Registrations", value: "(none)" }] },
  {
    title: translate("Browser push subscription"),
    rows: [
      { label: "Subscription exists", value: pushSub.value.exists },
      { label: "Endpoint host", value: pushSub.value.endpointHost }
    ]
  },
  { title: translate("Expected topic names"), rows: expectedTopics.value },
  { title: translate("Server-side subscriptions"), rows: subscribedTopics.value }
]);

function readEnv() {
  const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  const vapid = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  let parsed: any = null;
  try {
    parsed = rawConfig ? JSON.parse(rawConfig) : null;
  } catch (error) {
    parsed = null;
  }
  env.value = {
    hasConfig: !!(parsed && parsed.apiKey),
    projectId: parsed?.projectId || "(unset)",
    hasVapid: !!(vapid && String(vapid).length > 20)
  };
}

function readPlatform() {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone === true;
  const match = ua.match(/OS (\d+)[_.](\d+)/);
  platform.value = {
    standalone: String(!!standalone),
    userAgent: ua,
    iosVersion: match ? `${match[1]}.${match[2]}` : "(not iOS)"
  };
}

async function readSupport() {
  let supported = "(unknown)";
  try {
    const { isSupported } = await import("firebase/messaging");
    supported = String(await isSupported());
  } catch (error: any) {
    supported = `error: ${error?.message || error}`;
  }
  support.value = {
    fcmSupported: supported,
    notificationApi: typeof window !== "undefined" && "Notification" in window,
    serviceWorkerApi: "serviceWorker" in navigator,
    pushManagerApi: typeof window !== "undefined" && "PushManager" in window,
    permission: "Notification" in window ? Notification.permission : "(no Notification API)"
  };
}

async function readWorkers() {
  const rows: Row[] = [];
  let subscription: any = null;
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    registrations.forEach((registration: any, index: number) => {
      const worker = registration.active || registration.waiting || registration.installing;
      rows.push({
        label: `SW ${index + 1} scope`,
        value: `${registration.scope} — script ${worker?.scriptURL || "(none)"} — state ${worker?.state || "(none)"}`
      });
      if (!subscription && registration.pushManager) subscription = registration;
    });

    let found: any = null;
    for (const registration of registrations as any[]) {
      try {
        const existing = await registration.pushManager?.getSubscription?.();
        if (existing) { found = existing; break; }
      } catch (error) { /* scope may not allow push */ }
    }
    pushSub.value = found
      ? { exists: "true", endpointHost: (() => { try { return new URL(found.endpoint).host; } catch { return "(unparseable)"; } })() }
      : { exists: "false", endpointHost: "(none)" };
  } catch (error: any) {
    rows.push({ label: "Service worker read failed", value: String(error?.message || error) });
    pushSub.value = { exists: "(unknown)", endpointHost: "(unknown)" };
  }
  workers.value = rows;
}

async function refresh() {
  readEnv();
  readPlatform();
  await readSupport();
  await readWorkers();
}

async function registerDevice() {
  isBusy.value = true;
  steps.value = [];
  const push = (label: string, ok: boolean, detail?: string) => steps.value.push({ label, ok, detail });

  try {
    const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
    const { initializeApp, getApps, getApp } = await import("firebase/app");

    const supported = await isSupported();
    push("Push supported in this context", supported, supported ? undefined : "iOS needs the Home Screen app over HTTPS");
    if (!supported) return;

    let config: any = null;
    try { config = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG); } catch (error) { config = null; }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    push("Firebase config present", !!config?.apiKey, config?.projectId);
    push("VAPID key present", !!vapidKey);
    if (!config?.apiKey || !vapidKey) return;

    // Must run inside this tap: iOS only shows the prompt for a user gesture.
    const permission = await Notification.requestPermission();
    push(`Permission result: ${permission}`, permission === "granted",
      permission === "denied" ? "Delete and re-add the Home Screen app to be asked again" : undefined);
    if (permission !== "granted") return;

    const app = getApps().length ? getApp() : initializeApp(config);
    const messaging = getMessaging(app);

    let token = "";
    try {
      token = await getToken(messaging, { vapidKey });
      push("FCM token obtained", !!token, token ? `${token.slice(0, 12)}…${token.slice(-6)}` : "empty token");
    } catch (error: any) {
      push("FCM token request failed", false, String(error?.message || error));
      return;
    }
    if (!token) return;

    const store = useNotificationStore();
    const deviceId = firebaseMessaging.generateDeviceId(store.getFirebaseDeviceId);
    try {
      await api({
        url: "firebase/token",
        method: "post",
        data: { registrationToken: token, deviceId, applicationId: import.meta.env.VITE_NOTIF_APP_ID }
      });
      store.setFirebaseDeviceId(deviceId);
      store.isFirebaseInitialised = true;
      push("Token sent to backend", true, `deviceId ${deviceId}`);
    } catch (error: any) {
      push("Backend rejected the token", false, `${error?.response?.status || ""} ${error?.message || error}`.trim());
      return;
    }

    try {
      await store.fetchAllNotificationPrefs(import.meta.env.VITE_NOTIF_APP_ID, (useUserStore().getUserProfile as any)?.userId);
      const count = store.getAllNotificationPrefs?.length ?? 0;
      push("Server-side topic subscriptions", count > 0, `${count} found`);
    } catch (error: any) {
      push("Could not read topic subscriptions", false, String(error?.message || error));
    }
  } catch (error: any) {
    logger.error(error);
    push("Unexpected failure", false, String(error?.message || error));
  } finally {
    isBusy.value = false;
    await refresh();
  }
}

async function showLocalTestNotification() {
  isBusy.value = true;
  const push = (label: string, ok: boolean, detail?: string) => steps.value.push({ label, ok, detail });
  // Pushed synchronously so a click is always acknowledged on screen, even if an await below stalls.
  steps.value = [{ label: "Test started", ok: true, detail: new Date().toLocaleTimeString() }];

  try {
    if (!("Notification" in window)) {
      push("No Notification API in this context", false);
      return;
    }
    if (Notification.permission === "denied") {
      push("Permission is denied", false, "Reset notifications for this site in browser settings, or delete and re-add the Home Screen app on iOS");
      return;
    }
    if (Notification.permission === "default") {
      // Safe here: this runs inside the button tap, which is what iOS requires.
      const result = await Notification.requestPermission();
      push(`Permission requested: ${result}`, result === "granted");
      if (result !== "granted") return;
    }

    const tag = `hotwax-test-${Date.now()}`;
    const options: any = {
      body: "If you can see this, the device can display notifications. Server delivery is a separate step.",
      icon: "/img/icons/msapplication-icon-144x144.png",
      tag,
      data: { click_action: "/notifications" }
    };

    // Do NOT use navigator.serviceWorker.ready: it only settles for a worker controlling this
    // page's scope, and Firebase registers its worker under /firebase-cloud-messaging-push-scope.
    let registrations: any[] = [];
    try {
      registrations = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    } catch (error: any) {
      push("Could not list service workers", false, String(error?.message || error));
    }

    const usable = registrations.filter((registration: any) => typeof registration.showNotification === "function");
    push(`Service workers available: ${usable.length}`, usable.length > 0,
      usable.map((registration: any) => registration.scope).join(", ") || "none registered");

    let shown = false;
    for (const registration of usable) {
      try {
        await registration.showNotification("HotWax BOPIS test", options);
        // showNotification resolves even when the OS suppresses the banner, so read it back.
        // showNotification resolving means the OS accepted it. Do not treat the readback as pass/fail:
        // when the OS owns the alert (macOS native delivery, iOS) getNotifications legitimately returns 0.
        push("Handed to the operating system", true, `scope ${registration.scope}`);
        const live = await registration.getNotifications({ tag });
        push(`Readback found ${live.length}`, true,
          live.length ? "still owned by the page" : "zero is normal when the OS owns the alert");
        push("If no banner appeared, the device is suppressing it", false,
          "The app did its job. Check the per-app alert style (must not be None), Allow Notifications, Focus / Do Not Disturb, and Scheduled Summary. A web page cannot read these, so they must be checked on the device itself.");
        shown = true;
        break;
      } catch (error: any) {
        push(`showNotification failed on ${registration.scope}`, false, String(error?.message || error));
      }
    }

    if (!shown) {
      try {
        const direct = new Notification("HotWax BOPIS test (direct)", options);
        push("Fell back to the Notification constructor", true,
          "Displayed without a service worker. iOS web apps do not support this path, desktop browsers do.");
        setTimeout(() => direct.close(), 8000);
      } catch (error: any) {
        push("Direct notification failed too", false, String(error?.message || error));
        push("Nothing could display on this device", false,
          "Permission is granted, so this is almost certainly blocked at the operating system level, not by the app.");
      }
    }
  } catch (error: any) {
    push("Local notification failed", false, String(error?.message || error));
  } finally {
    isBusy.value = false;
    await refresh();
  }
}

async function resubscribeTopics() {
  isBusy.value = true;
  const push = (label: string, ok: boolean, detail?: string) => steps.value.push({ label, ok, detail });
  steps.value = [{ label: "Re-subscribe started", ok: true, detail: new Date().toLocaleTimeString() }];

  try {
    const store = useNotificationStore();
    const appId = import.meta.env.VITE_NOTIF_APP_ID;
    const userId = (useUserStore().getUserProfile as any)?.userId;
    const facility: any = useProductStore().getCurrentFacility;
    const oms = commonUtil.getOMSInstanceName();

    if (!store.getFirebaseDeviceId) {
      push("No device token registered yet", false, "Run the register step first, then re-subscribe");
      return;
    }
    push("Device token present", true, store.getFirebaseDeviceId);

    const enabled = (store.getNotificationPrefs || []).filter((pref: any) => pref.isEnabled);
    if (!enabled.length) {
      push("No preferences are switched on", false, "Turn one on in Settings first");
      return;
    }

    // The app subscribes the topic BEFORE the device token exists, so the token never joins
    // the topic. Unsubscribing and resubscribing now that a token is registered repairs it.
    for (const pref of enabled) {
      const topicName = firebaseMessaging.generateTopicName(oms, facility?.facilityId, pref.enumId);
      try {
        await api({ url: "firebase/topic", method: "delete", data: { topicName, applicationId: appId } });
        await api({ url: "firebase/topic", method: "post", data: { topicName, applicationId: appId } });
        push(`Re-subscribed ${pref.enumId}`, true, topicName);
      } catch (error: any) {
        push(`Failed on ${pref.enumId}`, false, `${error?.response?.status || ""} ${error?.message || error}`.trim());
      }
    }

    try {
      await store.fetchAllNotificationPrefs(appId, userId);
      push("Server-side subscriptions now", true, String(store.getAllNotificationPrefs?.length ?? 0));
    } catch (error: any) {
      push("Could not re-read subscriptions", false, String(error?.message || error));
    }
    push("Now place a test order", true, "A notification should arrive without reloading");
  } catch (error: any) {
    push("Re-subscribe failed", false, String(error?.message || error));
  } finally {
    isBusy.value = false;
    await refresh();
  }
}

function buildReportText() {
  const lines: string[] = ["HotWax BOPIS notification diagnostics", new Date().toISOString(), ""];
  lines.push("VERDICT");
  verdict.value.forEach((line) => lines.push(`  ${line.ok ? "OK " : (line.warn ? "?? " : "XX ")} ${line.text}`));
  if (steps.value.length) {
    lines.push("", "LAST ACTION");
    steps.value.forEach((step) => lines.push(`  ${step.ok ? "OK " : "XX "} ${step.label}${step.detail ? ` — ${step.detail}` : ""}`));
  }
  groups.value.forEach((group: any) => {
    lines.push("", group.title.toUpperCase());
    group.rows.forEach((row: Row) => lines.push(`  ${row.label}: ${row.value}`));
  });
  return lines.join("\n");
}

async function copyReport() {
  const text = buildReportText();
  try {
    await navigator.clipboard.writeText(text);
    commonUtil.showToast(translate("Report copied to the clipboard."));
  } catch (error) {
    // Clipboard API needs a secure context and can be blocked; fall back to a selectable prompt.
    window.prompt("Copy this report", text);
  }
}

function closeModal() {
  modalController.dismiss({ dismissed: true });
}

onMounted(refresh);
</script>

<style scoped>
.verdict-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 8px 0;
}

.value {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
  white-space: normal;
}
</style>
