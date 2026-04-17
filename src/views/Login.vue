<template>
  <ion-page>
    <ion-content>
      <div class="flex" v-if="!isInitializing && !isConfirmingForActiveSession">
        <form class="login-container" @keyup.enter="handleSubmit()" @submit.prevent>
          <Logo />

          <section v-if="errorMessage">
            <div>
              <ion-item lines="none">
                <ion-icon slot="start" color="warning" :icon="warningOutline" />
                <h4>{{ translate('Login failed') }}</h4>
              </ion-item>
              <p>
                {{ errorMessage }}
              </p>
              <ion-button class="ion-margin-top" @click="goToLogin()">
                <ion-icon slot="start" :icon="arrowBackOutline" />
                {{ translate("Back to Login") }}
              </ion-button>
            </div>
          </section>

          <section v-else-if="showOmsInput">
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
    
      <ion-fab @click="router.push('/')" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="medium">
          <ion-icon :icon="gridOutline" /> 
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonChip, IonContent, IonFab, IonFabButton, IonIcon, IonInput, IonItem, IonPage, IonSpinner, loadingController, onIonViewWillEnter } from "@ionic/vue";
import { ref } from "vue";
import router from "../router";
import { useUserStore } from "@/store/user";
import Logo from '@/components/Logo.vue';
import { arrowBackOutline, arrowForwardOutline, gridOutline, warningOutline } from 'ionicons/icons'
import { cookieHelper, translate, commonUtil } from "@common";
import { useAuth } from "@/composables/useAuth";

let route = null as any;
const userStore = useUserStore();

// This is the best practice for defining composable instance, as this ensures in managing the reactive state properly
const { loginOption, fetchLoginOptions, isAuthenticated, login: authLogin, updateToken, updateOMS } = useAuth();

const username = ref("");
const password = ref("");
const instanceUrl = ref("");
const errorMessage = ref("");
const alias = import.meta.env.VITE_ALIAS ? JSON.parse(import.meta.env.VITE_ALIAS) : {};
const defaultAlias = import.meta.env.VITE_DEFAULT_ALIAS;
const showOmsInput = ref(false);
const isInitializing = ref(true);
const isConfirmingForActiveSession = ref(false);
const loader = ref<any>(null);
const isCheckingOms = ref(false);
const isLoggingIn = ref(false);

const goToLogin = () => {
  router.go(0);
}

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

const login = async (params?: any) => {
  if((!username.value || !password.value) && !params.token) {
    commonUtil.showToast(translate('Please fill in the user details'));
    return;
  }

  isLoggingIn.value = true;
  try {
    await authLogin(username.value?.trim(), password.value, params?.token, params?.expirationTime)
    // All the failure cases are handled in action, if then block is executing, login is successful
    username.value = "";
    password.value = "";
    router.push('/');
  } catch (error: any) {
    errorMessage.value = error
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
  updateOMS(alias[instanceURL] ? alias[instanceURL] : instanceURL)
  userStore.oms = alias[instanceURL] ? alias[instanceURL] : instanceURL

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

const initialise = async () => {
  isInitializing.value = true;
  await presentLoader("Processing");

  if (route.query?.token) {
    // SAML login handling as only token will be returned in the query when login through SAML
    await login(route.query)
    dismissLoader();
    return;
  }

  // fetch login options only if OMS is there as API calls require OMS
  if (cookieHelper().get("oms")) {
    await fetchLoginOptions();
  }

  // show OMS input if SAML if configured or if query or state does not have OMS
  if (loginOption.value.loginAuthType !== 'BASIC' || route.query?.oms || !cookieHelper().get("OMS")) {
    showOmsInput.value = true;
  }

  // if a session is already active, login directly in the app
  if (isAuthenticated.value) {
    router.push('/');
  }

  if(cookieHelper().get("oms") && cookieHelper().get("token") && cookieHelper().get("userId") && cookieHelper().get("expirationTime")) {
    login({ token: cookieHelper().get("token"), expirationTime: cookieHelper().get("expirationTime") })
  }

  instanceUrl.value = commonUtil.getOMSInstanceName();
  if (instanceUrl.value) {
    // If the current URL is available in alias show it for consistency
    const currentInstanceUrlAlias = Object.keys(alias).find((key) => alias[key] === instanceUrl.value);
    currentInstanceUrlAlias && (instanceUrl.value = currentInstanceUrlAlias);
  }
  // If there is no current preference set the default one
  if (!instanceUrl.value && defaultAlias) {
    instanceUrl.value = defaultAlias;
  }
  dismissLoader();
  isInitializing.value = false;
};

const handleSubmit = () => {
  if (instanceUrl.value.trim() && showOmsInput.value && (!username.value && !password.value)) setOms();
  else if (instanceUrl.value) login();
};

onIonViewWillEnter(() => {
  // TODO: check why useRoute and useRouter are not working
  route = router.currentRoute.value;
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