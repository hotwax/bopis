<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { defineComponent } from 'vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { mapGetters, useStore } from 'vuex';
import { init, resetConfig } from '@/adapter'
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet
  },
  data() {
    return {
      loader: null as any,
      maxAge: process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0
    }
  },
  methods: {
    async presentLoader() {
      // if currently loader is not present then creating a new loader
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
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
    async unauthorized() {
      this.store.dispatch("user/logout");
      this.router.push("/login")
    }
  }, 
  computed: {
    ...mapGetters({
      locale: 'user/getLocale',
      userToken: 'user/getUserToken',
      instanceUrl: 'user/getInstanceUrl'
    })
  },
  created() {
    init(this.userToken, this.instanceUrl, this.maxAge)
  },
  async mounted() {
    // creating the loader on mounted as loadingController is taking too much time to create initially
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
    emitter.on('unauthorized', this.unauthorized);
    this.$i18n.locale = this.locale;
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    emitter.off('unauthorized', this.unauthorized);
    resetConfig()
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      router,
      store
    }
  }
});
</script>
