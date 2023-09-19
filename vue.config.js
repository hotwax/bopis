require("@hotwax/app-version-info")
const path = require('path')

module.exports = {
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableLegacy: true,
      runtimeOnly: true,
      compositionOnly: false,
      fullInstall: true,
      enableInSFC: true
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        vue: path.resolve('./node_modules/vue')
      }
    }
  },
  runtimeCompiler: true,
  transpileDependencies: ['@hotwax/dxp-components']
}
