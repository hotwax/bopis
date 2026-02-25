import { createApp, computed, reactive } from 'vue'
import App from './App.vue'
import router from './router';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* Theme variables */
import './theme/variables.css';
import "@hotwax/apps-theme";

import permissionPlugin, { Actions, hasPermission, setPermissions } from '@/authorization';
import permissionRules from '@/authorization/Rules';
import permissionActions from '@/authorization/Actions';

import { dxpComponents } from '@hotwax/dxp-components'
import localeMessages from './locales';
import { login, logout, loader } from '@/utils/user';
import { addNotification, storeClientRegistrationToken } from '@/utils/firebase';
import { getConfig, fetchGoodIdentificationTypes, getProductIdentificationPref, getUserFacilities, getUserPreference, initialise, setProductIdentificationPref, setUserLocale, getAvailableTimeZones, setUserPreference } from '@/adapter';
import logger from './logger';

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useUserStore } from '@/store/user'

const app = createApp(App)
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate)

app.use(IonicVue, {
  mode: 'md',
  innerHTMLTemplatesEnabled: true
})
  .use(logger, {
    level: process.env.VUE_APP_DEFAULT_LOG_LEVEL
  })
  .use(router)
  .use(pinia)
  .use(permissionPlugin, {
    rules: permissionRules,
    actions: permissionActions
  })
  .use(dxpComponents, {
    Actions,
    addNotification,
    appLoginUrl: process.env.VUE_APP_LOGIN_URL as string,
    appFirebaseConfig: JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG),
    appFirebaseVapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY,
    defaultImgUrl: require("@/assets/images/defaultImage.png"),
    getConfig,
    fetchGoodIdentificationTypes,
    getProductIdentificationPref,
    initialise,
    loader,
    login,
    logout,
    localeMessages,
    setProductIdentificationPref,
    setUserLocale,
    storeClientRegistrationToken,
    getAvailableTimeZones,
    hasPermission,
    getUserFacilities,
    setUserPreference,
    getUserPreference
  });

const userStore = useUserStore();
setPermissions(userStore.getUserPermissions);

router.isReady().then(() => {
  app.mount('#app');
});

//TODO: Remove this after dxp-components is updated to replace appContext.config.globalProperties.$store and stopped calling vuex pattern getters/actions
app.config.globalProperties.$store = {
  getters: reactive({
    'user/getUserProfile': computed(() => useUserStore().getUserProfile),
    'user/getInstanceUrl': computed(() => useUserStore().getInstanceUrl),
    //'user/getCurrentFacility': computed(() => useUserStore().getCurrentFacility),
    //'user/getCurrentEComStore': computed(() => useUserStore().getCurrentEComStore),
  })
}
