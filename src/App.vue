<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet } from "@ionic/vue";
import { defineComponent, provide, ref } from "vue";
import { loadingController } from "@ionic/vue";
import emitter from "@/event-bus";
import { mapGetters, useStore } from "vuex";
import { initialise, resetConfig } from "@/adapter";
import { useRouter } from "vue-router";
import { useProductIdentificationStore } from "@hotwax/dxp-components";
import { showToast } from "./utils";

export default defineComponent({
  name: "App",
  components: {
    IonApp,
    IonRouterOutlet,
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE
        ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE)
        : 0,
    };
  },
  methods: {
    async presentLoader() {
      // if currently loader is not present then creating a new loader
      if (!this.loader) {
        this.loader = await loadingController.create({
          message: this.$t("Click the backdrop to dismiss."),
          translucent: true,
          backdropDismiss: true,
        });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        // on dismiss initializing the loader as null, so it can again be created
        this.loader = null as any;
      }
    },
    async unauthorised() {
      this.store.dispatch("user/logout");
      this.router.push("/login");
    },
  },
  computed: {
    ...mapGetters({
      locale: "user/getLocale",
      userToken: "user/getUserToken",
      instanceUrl: "user/getInstanceUrl",
      currentEComStore: "user/getCurrentEComStore",
    }),
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorised,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        },
      },
    });
  },
  async mounted() {
    // creating the loader on mounted as loadingController is taking too much time to create initially
    this.loader = await loadingController.create({
      message: this.$t("Click the backdrop to dismiss."),
      translucent: true,
      backdropDismiss: true,
    });
    emitter.on("presentLoader", this.presentLoader);
    emitter.on("dismissLoader", this.dismissLoader);
    this.$i18n.locale = this.locale;

    // Get product identification from api using dxp-component and set the state if eComStore is defined
    if (this.currentEComStore.productStoreId) {
      await useProductIdentificationStore().getIdentificationPref(this.currentEComStore.productStoreId)
        .catch((error) => console.log(error));
    }
  },
  unmounted() {
    emitter.off("presentLoader", this.presentLoader);
    emitter.off("dismissLoader", this.dismissLoader);
    resetConfig();
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    
    /* Start Product Identifier */

    const productIdentificationStore = useProductIdentificationStore();

    // Reactive state for productIdentificationPref
    let productIdentificationPref = ref(
      productIdentificationStore.$state.productIdentificationPref
    );

    // Providing productIdentificationPref to child components
    provide('productIdentificationPref', productIdentificationPref);

    // Subscribing to productIdentificationStore state change and changing value productIdentificationPref 
    // to store state based on condition
    productIdentificationStore.$subscribe((mutation: any, state) => {

      // If primaryId is '' then api call not changed the state, so not changing the productIdentificationPref
      if (state.productIdentificationPref.primaryId != "") {

        // If old state value is same as the new state value then not changing the preference
        if (mutation.events.oldValue.primaryId != state.productIdentificationPref.primaryId || mutation.events.oldValue.secondaryId != state.productIdentificationPref.secondaryId) {
          productIdentificationPref.value = state.productIdentificationPref;

          // If primary and secondary preference is '' then it was initial state value before api call show don't show toast
          if (mutation.events.oldValue.primaryId != "" && mutation.events.oldValue.secondaryId != "") {
            showToast("Product identifier preference updated");
          }
        }
      }
    });

    /* End Product Identifier */

    return {
      router,
      store,
    };
  },
});
</script>
