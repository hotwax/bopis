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
import { mapGetters } from 'vuex';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet
  },
  data() {
    return {
      loader: null as any
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
    }
  }, 
  computed: {
    ...mapGetters({
      locale: 'user/getLocale'
    })
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
    this.$i18n.locale = this.locale;
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
});
</script>
