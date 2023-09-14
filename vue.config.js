require("@hotwax/app-version-info")
const path = require("path")
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
  runtimeCompiler: true,
  configureWebpack:{
    resolve:{
      alias:{
        vue: path.resolve('./node_modules/vue')
      }
    }
  },
  transpileDependencies: ["@hotwax/dxp-components"]
}
