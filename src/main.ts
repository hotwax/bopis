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
import "@common/css/settings.css"
import "@common/css/theme.css"
import './theme/variables.css';

import { createDxpI18n, logger } from '@common';
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import localeMessages from '@/locales'

const app = createApp(App)
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate)

export const i18n = createDxpI18n(localeMessages)

app.use(IonicVue, {
  mode: 'md',
  innerHTMLTemplatesEnabled: true
})
  .use(logger, {
    level: import.meta.env.VITE_DEFAULT_LOG_LEVEL
  })
  .use(pinia)
  .use(router)
  .use(i18n);

router.isReady().then(() => {
  app.mount('#app');
});
