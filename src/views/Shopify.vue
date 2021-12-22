<template>
  <ion-page>
    <ion-content>
      <!-- Commented form tag as when using it the install page reloads again and
      then redirect to shopify -->
      <form @keyup.enter="install(shopOrigin)" @submit.prevent="install(shopOrigin)">
        <ion-list>
          <img src="../assets/images/hc.png" />
          <ion-item>
            <ion-label position="floating"> {{ $t("Shop") }}</ion-label>
            <ion-input
              v-model="shopOrigin"
              name="shopOrigin"
              type="text"
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
  },
  data() {
    return {
      apiKey: process.env.VUE_APP_SHOPIFY_API_KEY,
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
    if (this.session) {
      const app = createApp({
        apiKey: this.apiKey,
        host: this.host
      });
      const sessionToken = await getSessionToken(app);

      if (sessionToken) {
        this.$router.push("/");
      }

    } else if (this.code) {
      // TODO store returned status and perform operation based upon it
      await ShopifyService.generateAccessToken({
        "code": this.code,
        "shop": shop,
        "clientId": this.apiKey,
        "host": this.host,
        "hmac": this.hmac,
        "timestamp": this.timestamp
      }).then(resp => resp.json()).then(data => data.status).catch(err => console.warn(err));
      // TODO Navigate user based upon the status
      const appURL = `https://${this.shop}/admin/apps/${this.apiKey}`;
      window.location.assign(appURL);
    } else if (this.shop || this.host) {
      this.authorise(this.shop, this.host, this.apiKey);
    }
  },
  methods: {
    install(shopOrigin) {
      this.authorise(shopOrigin, undefined, this.apiKey);
    },
    authorise(shop, host, apiKey) {
      const scopes = process.env.VUE_APP_SHOPIFY_SCOPES
      emitter.emit("presentLoader");
      const redirectUri = process.env.VUE_APP_SHOPIFY_REDIRECT_URI;
      const permissionUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;

      if (window.top == window.self) {
        window.location.assign(permissionUrl);
      } else {
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
    return {
      router,
      showToast,
    };
  },
});
</script>

<style scoped></style>
