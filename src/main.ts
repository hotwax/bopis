import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { DateTime } from 'luxon';


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

import store from './store'

import permissionPlugin from '@/authorization';
import permissionRules from '@/authorization/Rules';
import permissionActions from '@/authorization/Actions';

import { dxpComponents } from '@hotwax/dxp-components'
import localeMessages from './locales';
import { login, logout, loader } from '@/utils/user';
import { addNotification, storeClientRegistrationToken } from '@/utils/firebase';
import { getConfig, getProductIdentificationPref, initialise, setProductIdentificationPref, setUserLocale } from '@/adapter';
import logger from './logger';

const app = createApp(App)
  .use(IonicVue, {
    mode: 'md'
  })
  .use(logger, {
    level: process.env.VUE_APP_DEFAULT_LOG_LEVEL
  })
  .use(router)
  .use(store)
  .use(permissionPlugin, {
    rules: permissionRules,
    actions: permissionActions
  })
  .use(dxpComponents, {
    addNotification,
    appLoginUrl: process.env.VUE_APP_LOGIN_URL as string,
    appFirebaseConfig: JSON.parse(process.env.VUE_APP_FIREBASE_CONFIG),
    appFirebaseVapidKey: process.env.VUE_APP_FIREBASE_VAPID_KEY,
    defaultImgUrl: require("@/assets/images/defaultImage.png"),
    getConfig,
    getProductIdentificationPref,
    initialise,
    loader,
    login,
    logout,
    localeMessages,
    setProductIdentificationPref,
    setUserLocale,
    storeClientRegistrationToken,
  });

// Filters are removed in Vue 3 and global filter introduced https://v3.vuejs.org/guide/migration/filters.html#global-filters
app.config.globalProperties.$filters = {
  formatDate(value: any, inFormat?: string, outFormat?: string) {
    if(inFormat){
      return DateTime.fromFormat(value, inFormat).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
    }
    return DateTime.fromISO(value).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
  },
  formatUtcDate(value: any, inFormat?: any, outFormat?: string) {
    // TODO Make default format configurable and from environment variables
    const userProfile = store.getters['user/getUserProfile'];
    // TODO Fix this setDefault should set the default timezone instead of getting it everytiem and setting the tz
    return DateTime.fromISO(value, { zone: 'utc' }).setZone(userProfile.userTimeZone).toFormat(outFormat ? outFormat : 'MM-dd-yyyy')  
  },
  getIdentificationId(identifications: any, id: string) {
    let  externalId = ''
    if (identifications) {
      const externalIdentification = identifications.find((identification: any) => identification.startsWith(id))
      const externalIdentificationSplit = externalIdentification ? externalIdentification.split('/') : [];
      externalId = externalIdentificationSplit[1] ? externalIdentificationSplit[1] : '';
    }
    return externalId;
  },
  getFeature(featureHierarchy: any, featureKey: string) {
    let  featureValue = ''
    if (featureHierarchy) {
      const feature = featureHierarchy.find((featureItem: any) => featureItem.startsWith(featureKey))
      const featureSplit = feature ? feature.split('/') : [];
      featureValue = featureSplit[2] ? featureSplit[2] : '';
    }
    return featureValue;
  }
}


router.isReady().then(() => {
  app.mount('#app');
});