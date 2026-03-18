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
              <ion-input
                :label="translate('Shop')"
                label-placement="floating"
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
              {{ translate("Install")  }}
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonInput, IonItem, IonList, IonPage } from "@ionic/vue";
import { onMounted, onBeforeUnmount, ref } from "vue";
import { Redirect } from "@shopify/app-bridge/actions";
import createApp from "@shopify/app-bridge";
import { useRouter, useRoute } from "vue-router";
import { cookieHelper, emitter, translate } from "@common"
import { useOrder } from "@/composables/useOrder"
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useUserStore } from "@/store/user";
import Logo from '@/components/Logo.vue'

const router = useRouter();
const route = useRoute();
const { generateAccessToken } = useOrder();

const apiKey = ref(import.meta.env.VITE_SHOPIFY_API_KEY);
const shopConfigs = ref(JSON.parse(import.meta.env.VITE_SHOPIFY_SHOP_CONFIG || '{}'));
const shopOrigin = ref('');

const session = route.query['session'];
const hmac = route.query['hmac'];
const shop = route.query['shop'];
const host = route.query['host'];
const timestamp = route.query['timestamp'];
const code = route.query['code'];

const authorise = (shop: any, host: any, apiKeyVal: any) => {
  const scopes = import.meta.env.VITE_SHOPIFY_SCOPES
  emitter.emit("presentLoader");
  const shopConfig = shopConfigs.value[shop];
  if (!apiKeyVal) apiKeyVal = shopConfig ? shopConfig.apiKey : '';
  const redirectUri = import.meta.env.VITE_SHOPIFY_REDIRECT_URI;
  const permissionUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKeyVal}&scope=${scopes}&redirect_uri=${redirectUri}`;

  if (window.top == window.self) {
    window.location.assign(permissionUrl);
  } else {
    // TODO Handle for host
    const app = createApp({
      apiKey: apiKeyVal,
      host: host as string,
    });
    Redirect.create(app).dispatch(Redirect.Action.REMOTE, permissionUrl);
  }
  emitter.emit("dismissLoader");
}

const install = (shopOrigin: string) => {
  authorise(shopOrigin, undefined, apiKey.value);
}

onMounted(async () => {
  const shopVal = (shop as string) || shopOrigin.value;
  const shopConfig = shopConfigs.value[shopVal];
  const apiKeyVal = shopConfig ? shopConfig.apiKey : '';
  const oms = shopConfig ? shopConfig.oms : '';
  cookieHelper().set("oms", oms);

  if (session) {
    const app = createApp({
      apiKey: apiKeyVal,
      host: host as string
    });
    const sessionToken = await getSessionToken(app);
    if (sessionToken) {
      // TODO Verify from server
      router.push("/");
    }
  } else if (code) {
    // TODO store returned status and perform operation based upon it
    try {
      const resp = await generateAccessToken({
        data: {
          "code": code,
          "shop": shopVal,
          "clientId": apiKeyVal,
          "host": host,
          "hmac": hmac,
          "timestamp": timestamp
        },
        baseURL: `https://${oms}.hotwax.io/api/`
      });
      await resp.json();
    } catch (err) {
      console.warn(err);
    }
    const appURL = `https://${shopVal}/admin/apps/${apiKeyVal}`;
    window.location.assign(appURL);
  } else if (shop || host) {
    authorise(shopVal, host, apiKeyVal);
  }
});

onBeforeUnmount(() => {
  emitter.emit("dismissLoader");
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
