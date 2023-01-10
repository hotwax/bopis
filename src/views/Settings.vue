<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="user-profile">
        <ion-card>
          <ion-item lines="full">
            <ion-avatar slot="start" v-if="userProfile?.partyImageUrl">
              <Image :src="userProfile.partyImageUrl"/>
            </ion-avatar>
            <ion-label>
              {{ userProfile?.partyName }}
              <p>{{ userProfile?.userLoginId }}</p>
            </ion-label>
          </ion-item>
          <ion-button fill="outline" color="danger" @click="logout()">{{ $t("Logout") }}</ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ $t("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <h1>{{ $t('OMS') }}</h1>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("OMS instance") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ baseURL ? baseURL : instanceUrl }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('This is the name of the OMS you are connected to right now. Make sure that you are connected to the right instance before proceeding.') }}
          </ion-card-content>
          <ion-button @click="goToOms" fill="clear">
            {{ $t('Go to OMS') }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Shopify Config") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("eCommerce") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('eCommerce stores are directly connected to one Shop Configs. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Select eCommerce") }}</ion-label>
            <ion-select interface="popover" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Shipping orders") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-item lines="none">
            <ion-toggle :checked="showShippingOrders" @ionChange="setShowShippingOrdersPreference($event)" slot="end" />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Packing slip") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Packing slip") }}
            </ion-card-title>
          </ion-card-header>
          <ion-item lines="none">
            <ion-toggle :checked="showPackingSlip" @ionChange="setShowPackingSlipPreference($event)" slot="end" />
          </ion-item>
        </ion-card>
      </section>

      <hr />

      <h1>{{ $t('App') }}</h1>

      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Timezone') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('The timezone you select is used to ensure automations you schedule are always accurate to the time you select.') }}
          </ion-card-content>

          <ion-item lines="none">
            <ion-label> {{ userProfile && userProfile.userTimeZone ? userProfile.userTimeZone : '-' }} </ion-label>
            <ion-button @click="changeTimeZone()" slot="end" fill="outline" color="dark">{{ $t("Change") }}</ion-button>
          </ion-item>
        </ion-card>
      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle , IonToolbar, modalController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { ellipsisVertical, personCircleOutline, sendOutline , storefrontOutline, codeWorkingOutline, openOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import Image from '@/components/Image.vue';
import TimeZoneModal from '@/views/TimezoneModal.vue';

export default defineComponent({
  name: 'Settings',
  components: {
    IonAvatar,
    IonButton, 
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel, 
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle,
    IonToggle, 
    IonToolbar,
    Image
  },
  data(){
    return {
      baseURL: process.env.VUE_APP_BASE_URL
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      showShippingOrders: 'user/showShippingOrders',
      showPackingSlip: 'user/showPackingSlip'
    })
  },
  methods: {
    setFacility (facility: any) {
      if (this.userProfile)
        this.store.dispatch('user/setFacility', {
          'facility': this.userProfile.facilities.find((fac: any) => fac.facilityId == facility['detail'].value)
        });
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.router.push('/login');
      })
    },
    setShowShippingOrdersPreference (ev: any) {
      this.store.dispatch('user/setUserPreference', { showShippingOrders: ev.detail.checked })
    },
    setShowPackingSlipPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { showPackingSlip: ev.detail.checked })
    },
    goToOms(){
      window.open(this.instanceUrl.startsWith('http') ? this.instanceUrl.replace('api/', "") : `https://${this.instanceUrl}.hotwax.io/`, '_blank', 'noopener, noreferrer');
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    }
  },
  setup () {
    const store = useStore();
    const router = useRouter();

    return {
      ellipsisVertical,
      personCircleOutline,
      router,
      sendOutline,
      store,
      storefrontOutline,
      codeWorkingOutline,
      openOutline
    }
  }
});
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
  }
  h1 {
    padding: var(--spacer-xs) 10px 0;
  }
  section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    align-items: start;
  }
  .user-profile {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
  hr {
    border-top: 1px solid var(--ion-color-medium);
  }
</style>
