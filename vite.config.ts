import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { versionInfoUtil } from '../../common/utils/versionInfoUtil'
import pkg from './package.json'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from "./manifest.json"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appBuild = env.VITE_APP_BUILD
  
  return {
    base: appBuild ? `/${appBuild}/` : '/',
    build: {
      outDir: appBuild ? `dist/${env.VITE_APP_BUILD}` : 'dist'
    },
    plugins: [
      vue(),
      legacy(),
      VitePWA({
        registerType: "autoUpdate",
        selfDestroying: true,
        manifest: manifest as any,
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'import.meta.env.VITE_APP_VERSION_INFO': JSON.stringify(JSON.stringify(versionInfoUtil.getVersionInfo(pkg.version)))
    },
    resolve: {
      dedupe: ['vue', 'pinia', 'vue-router'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@common': path.resolve(__dirname, '../../common')
      },
    },
    server: {
      port: 8100
    },
    test: {
      globals: true,
      environment: 'jsdom'
    }
  }
})
