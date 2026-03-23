<template>
  <ion-page>
    <ion-content>
      <div class="flex" v-if="!hideBackground && !isConfirmingForActiveSession">
        <form class="login-container" @keyup.enter="handleSubmit()" @submit.prevent>
          <Logo />
          <section v-if="showOmsInput">
            <ion-item lines="full">
              <ion-input :label="translate('OMS')" label-placement="fixed" name="instanceUrl" v-model="instanceUrl" id="instanceUrl" type="text" required />
            </ion-item>

            <div class="ion-padding">
              <!-- @keyup.enter.stop to stop the form from submitting on enter press as keyup.enter is already bound
              through the form above, causing both the form and the button to submit. -->
              <ion-button color="primary" expand="block" @click.prevent="isCheckingOms ? '' : setOms()" @keyup.enter.stop>
                {{ translate("Next") }}
                <ion-spinner v-if="isCheckingOms" name="crescent" slot="end" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>

          <section v-else>
            <div class="ion-text-center ion-margin-bottom">
              <ion-chip :outline="true" @click="toggleOmsInput()">
                {{ cookieHelper().get("oms") }}
              </ion-chip>
            </div>

            <ion-item lines="full">
              <ion-input :label="translate('Username')" label-placement="fixed" name="username" v-model="username" id="username"  type="text" required />
            </ion-item>
            <ion-item lines="none">
              <ion-input :label="translate('Password')" label-placement="fixed" name="password" v-model="password" id="password" type="password" required />
            </ion-item>

            <div class="ion-padding">
              <ion-button color="primary" expand="block" @click="isLoggingIn ? '' : login()">
                {{ translate("Login") }}
                <ion-spinner v-if="isLoggingIn" slot="end" name="crescent" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonChip,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSpinner,
  loadingController,
  onIonViewWillEnter
} from "@ionic/vue";
import { ref } from "vue";
import { useUserStore } from "@/store/user";
import Logo from '@/components/Logo.vue';
import { arrowForwardOutline } from 'ionicons/icons'
import { api, commonUtil, cookieHelper, translate } from "@common";
import { useAuth } from "@/composables/useAuth";
import { useRoute, useRouter } from "vue-router";

const userStore = useUserStore();
const router = useRouter();
const route = useRoute();

// This is the best practice for defining composable instance, as this ensures in managing the reactive state properly
const { loginOption, fetchLoginOptions, login: authLogin, clearAuth } = useAuth();

const username = ref("");
const password = ref("");
const instanceUrl = ref("");
const baseURL = import.meta.env.VITE_VUE_APP_BASE_URL;
const alias = import.meta.env.VITE_VUE_APP_ALIAS ? JSON.parse(import.meta.env.VITE_VUE_APP_ALIAS) : {};
const defaultAlias = import.meta.env.VITE_VUE_APP_DEFAULT_ALIAS;
const showOmsInput = ref(false);
const hideBackground = ref(true);
const isConfirmingForActiveSession = ref(false);
const loader = ref<any>(null);
const isCheckingOms = ref(false);
const isLoggingIn = ref(false);

const presentLoader = async (message: string) => {
  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: translate(message),
        translucent: true,
        backdropDismiss: false
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

const toggleOmsInput = () => {
  showOmsInput.value = !showOmsInput.value;
  // clearing username and password if moved to OMS input
  if (showOmsInput.value) {
    username.value = "";
    password.value = "";
  }
};

const login = async () => {
  if (!username.value || !password.value) {
    commonUtil.showToast(translate('Please fill in the user details'));
    return;
  }

  isLoggingIn.value = true;
  try {
    await authLogin(username.value.trim(), password.value);
    // All the failure cases are handled in action, if then block is executing, login is successful
    username.value = "";
    password.value = "";
    router.push('/');
  } catch (error) {
    console.error(error);
  }
  isLoggingIn.value = false;
};

const setOms = async () => {
  if (!instanceUrl.value) {
    commonUtil.showToast(translate('Please fill in the OMS'));
    return;
  }

  isCheckingOms.value = true;

  const instanceURL = instanceUrl.value.trim().toLowerCase();
  if (!baseURL) {
    cookieHelper().set('oms', alias[instanceURL] ? alias[instanceURL] : instanceURL)
  }

  // run SAML login flow if login options are configured for the OMS
  await fetchLoginOptions();

  // checking loginOption.length to know if fetchLoginOptions API returned data
  // as toggleOmsInput is called twice without this check, from fetchLoginOptions and
  // through setOms (here) again
  if (Object.keys(loginOption.value).length && loginOption.value.loginAuthType !== 'BASIC') {
    window.location.href = `${loginOption.value.loginAuthUrl}?relaystate=${window.location.origin}/login`;
  } else {
    toggleOmsInput();
  }
  isCheckingOms.value = false;
};

const samlLogin = async () => {
  try {
    const { token, expirationTime } = route.query as any;
    await userStore.samlLogin(token, expirationTime);
  } catch (error) {
    console.error(error);
  }
  router.push('/');
};

const basicLogin = async () => {
  try {
    const { oms, token, expirationTime } = route.query as any;
    // Clear the previously stored oms and token when having oms and token in the URL
    // This is the case when coming from launchpad
    clearAuth()

    cookieHelper().set("oms", oms)

    // checking for login options as we need to get maarg instance URL for accessing specific apps
    await fetchLoginOptions();

    // Setting token previous to getting user-profile, if not then the client method honors the state token
    cookieHelper().set('token', token);
    cookieHelper().set('expirationTime', expirationTime)

    try {
      const userProfileResp = await api({
        url: "admin/user/profile",
        method: "get",
        baseUrl: commonUtil.getMaargURL()
      });
      const current = userProfileResp.data
      userStore.$patch({
        current: current
      });
    } catch(error: any) {
      commonUtil.showToast(translate("Failed to fetch user profile information"));
      console.error("error", error);
      clearAuth();
      return Promise.reject(new Error(error));
    }

    await userStore.fetchPermissions();
  } catch (error) {
    commonUtil.showToast(translate('Failed to fetch user-profile, please try again'));
    console.error("error: ", error);
  }
  router.replace('/');
};

const initialise = async () => {
  hideBackground.value = true;
  await presentLoader("Processing");

  // Run the basic login flow when oms and token both are found in query
  if (route.query?.oms && route.query?.token) {
    await basicLogin();
    dismissLoader();
    return;
  } else if (route.query?.token) {
    // SAML login handling as only token will be returned in the query when login through SAML
    await samlLogin();
    dismissLoader();
    return;
  }

  // fetch login options only if OMS is there as API calls require OMS
  if (cookieHelper().get("OMS")) {
    await fetchLoginOptions();
  }

  // show OMS input if SAML if configured or if query or state does not have OMS
  if (loginOption.value.loginAuthType !== 'BASIC' || route.query?.oms || !cookieHelper().get("OMS")) {
    showOmsInput.value = true;
  }

  // Update OMS input if found in query
  if (route.query?.oms) {
    instanceUrl.value = route.query.oms as string;
  }

  // if a session is already active, login directly in the app
  if (useAuth().isAuthenticated.value) {
    router.push('/');
  }

  // const token = cookieHandler.get('token');
  // if (userStore.token && !token) {
  //   cookieHandler.set('token', userStore.token.value);
  //   cookieHandler.set('expirationTime', userStore.token.expiration);
  // }

  instanceUrl.value = cookieHelper().get("OMS") as string;
  if (cookieHelper().get("OMS")) {
    // If the current URL is available in alias show it for consistency
    const currentInstanceUrlAlias = Object.keys(alias).find((key) => alias[key] === cookieHelper().get("OMS"));
    currentInstanceUrlAlias && (instanceUrl.value = currentInstanceUrlAlias);
  }
  // If there is no current preference set the default one
  if (!instanceUrl.value && defaultAlias) {
    instanceUrl.value = defaultAlias;
  }
  dismissLoader();
  hideBackground.value = false;
};

const handleSubmit = () => {
  if (instanceUrl.value.trim() && showOmsInput.value && (!username.value && !password.value)) setOms();
  else if (instanceUrl.value) login();
};

onIonViewWillEnter(() => {
  initialise();
});
</script>

<style scoped>
.login-container {
  width: 375px;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>