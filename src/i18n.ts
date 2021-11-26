import { createI18n, LocaleMessages, VueMessageType } from 'vue-i18n'

/**
 * Load locale messages
 * 
 * The loaded `JSON` locale messages is pre-compiled by `@intlify/vue-i18n-loader`, which is integrated into `vue-cli-plugin-i18n`.
 * See: https://github.com/intlify/vue-i18n-loader#rocket-i18n-resource-pre-compilation
 */
function loadLocaleMessages(): LocaleMessages<VueMessageType> {
  const locales = require.context('./locales', true, /[A-Za-z0-9-_,\s]+\.json$/i)
  const messages: LocaleMessages<VueMessageType> = {}
  locales.keys().forEach(key => {
    const matched = key.match(/([A-Za-z0-9-_]+)\./i)
    if (matched && matched.length > 1) {
      const locale = matched[1]
      messages[locale] = locales(key)
    }
  })
  return messages
}

const numberFormats = {
  'en': {
    currency: {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'symbol'
    }
  },
  'jp': {
    currency: {
      style: 'currency',
      currency: 'JPY',
      currencyDisplay: 'symbol'
    }
  },
  'fr': { 
    currency: {
      style: 'currency', 
      currency: 'EUR',
      currencyDisplay: 'symbol'
    }
  },
  'in': { 
    currency: {
      style: 'currency', 
      currency: 'INR',
      currencyDisplay: 'symbol'
    }
  },
  'za': { 
    currency: {
      style: 'currency', 
      currency: 'ZAR',
      currencyDisplay: 'symbol'
    }
  },
  'kr': { 
    currency: {
      style: 'currency', 
      currency: 'KRW',
      currencyDisplay: 'symbol'
    }
  },
  'il': { 
    currency: {
      style: 'currency', 
      currency: 'ILS',
      currencyDisplay: 'symbol'
    }
  },
  'ch': { 
    currency: {
      style: 'currency', 
      currency: 'CNY',
      currencyDisplay: 'symbol'
    }
  },
    
   

}
const i18n = createI18n({
  locale: process.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages(),
  numberFormats
})

// TODO Check if this is needed in updated versions
// Currently this method is added to be used in ts files
const translate = (key: string) => {
  if (!key) {
    return '';
  }
  return i18n.global.t(key);
};

export { i18n as default, translate, numberFormats }
 