<template>
  <ion-page>
    <ion-content>
      <div class="install">
        <!-- Commented form tag as when using it the install page reloads again and
        then redirect to shopify -->
        <form @keyup.enter="install(shopOrigin)" @submit.prevent="install(shopOrigin)">
          <ion-list>
            <Logo />
            <ion-item>
              <ion-label position="floating"> {{ $t("Shop") }}</ion-label>
              <ion-input
                v-model="shopOrigin"
                name="shopOrigin"
                type="text"
                placeholder="shop1.myshopify.com"
                required
              ></ion-input>
            </ion-item>
          </ion-list>
          <div class="ion-padding">
            <ion-button type="submit" expand="block">
              {{ $t("Install")  }}
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import { showToast } from "@/utils";
import { useRouter } from "vue-router";
import emitter from "@/event-bus"
import { ShopifyService } from "@/services/ShopifyService"
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useStore } from 'vuex'
import Logo from '@/components/Logo.vue'

export default defineComponent({
  name: "Shopify",
  components: {
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    Logo
  },
  data() {
    return {
      apiKey: process.env.VUE_APP_SHOPIFY_API_KEY,
      shopConfigs: JSON.parse(process.env.VUE_APP_SHOPIFY_SHOP_CONFIG),
      shopOrigin: '',
      session: this.$route.query['session'],
      hmac: this.$route.query['hmac'],
      shop: this.$route.query['shop'],
      host: this.$route.query['host'],
      locale: this.$route.query['locale'] || process.env.VUE_APP_I18N_LOCALE || process.env.VUE_APP_I18N_FALLBACK_LOCALE,
      timestamp: this.$route.query['timestamp'],
      code: this.$route.query['code']
    };
  },
  async mounted () {
    const shop = this.shop || this.shopOrigin
    const shopConfig = this.shopConfigs[shop];
    const apiKey = shopConfig ? shopConfig.apiKey : '';
    const oms = shopConfig ? shopConfig.oms : '';
    this.store.dispatch("user/setUserInstanceUrl", oms)
    if (this.session) {
      const app = createApp({
        apiKey: apiKey,
        host: this.host
      });
      const sessionToken = await getSessionToken(app);
      if (sessionToken) {
        // TODO Verify from server
        this.$router.push("/");
      }
    } else if (this.code) {
      // TODO store returned status and perform operation based upon it
      await ShopifyService.generateAccessToken({
        data: {
        "code": this.code,
        "shop": shop,
        "clientId": apiKey,
        "host": this.host,
        "hmac": this.hmac,
        "timestamp": this.timestamp
        },
        baseURL: `https://${oms}.hotwax.io/api/`
      }).then(resp => resp.json()).then(data => data.status).catch(err => console.warn(err));
      // TODO Navigate user based upon the status
      const appURL = `https://${shop}/admin/apps/${apiKey}`;
      window.location.assign(appURL);
    } else if (this.shop || this.host) {
      this.authorise(shop, this.host, apiKey);
    }
  },
  methods: {
    install(shopOrigin) {
      this.authorise(shopOrigin, undefined, this.apiKey);
    },
    authorise(shop, host, apiKey) {
      const scopes = process.env.VUE_APP_SHOPIFY_SCOPES
      emitter.emit("presentLoader");
      const shopConfig = this.shopConfigs[shop];
      if (!apiKey) apiKey = shopConfig ? shopConfig.apiKey : '';
      const redirectUri = process.env.VUE_APP_SHOPIFY_REDIRECT_URI;
      const permissionUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;

      if (window.top == window.self) {
        window.location.assign(permissionUrl);
      } else {
        // TODO Handle for host
        const app = createApp({
          apiKey,
          host,
        });
        Redirect.create(app).dispatch(Redirect.Action.REMOTE, permissionUrl);
      }
      emitter.emit("dismissLoader");
    }
  },
  beforeUnmount () {
    emitter.emit("dismissLoader")
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return {
      router,
      store,
      showToast,
    };
  },
});
</script>

<style scoped>
.install {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

form {
  max-width: 375px;
}
</style>