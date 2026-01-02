require("@hotwax/app-version-info")
const path = require('path')

module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        vue: path.resolve('./node_modules/vue')
      }
    }
  },
  runtimeCompiler: true,
  transpileDependencies: ['@hotwax/dxp-components'],
  outputDir: `dist/${process.env.VUE_APP_BUILD}`,
  publicPath: process.env.NODE_ENV === "production" ? `./${process.env.VUE_APP_BUILD}` : "/"
}
