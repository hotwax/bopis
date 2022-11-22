<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-list>
        <!-- Select store -->
        <ion-item>
          <ion-icon :icon="storefrontOutline" slot="start" />
          <ion-label>{{$t("eCom Store")}}</ion-label>
          <ion-select interface="popover" :value="currentFacility.facilityId" @ionChange="setFacility($event)">
            <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
          </ion-select>
        </ion-item>
        <!-- Shipping order preference -->
        <ion-item>
          <ion-icon :icon="sendOutline" slot="start" />
          <ion-label>{{$t("Shipping orders")}}</ion-label>
          <ion-toggle :checked="showShippingOrders" @ionChange="setShowShippingOrdersPreference($event)" slot="end" />
        </ion-item>
        <!-- Packing document preference -->
        <ion-item>
          <ion-icon :icon="sendOutline" slot="start" />
          <ion-label>{{ $t("Packing slip") }}</ion-label>
          <ion-toggle :checked="showPackingSlip" @ionChange="setShowPackingSlipPreference($event)" slot="end" />
        </ion-item>
        <!-- OMS information -->
        <ion-item>
          <ion-icon :icon="codeWorkingOutline" slot="start"/>
          <ion-label>{{ $t("OMS") }}</ion-label>
          <p slot="end">{{ baseURL ? baseURL : instanceUrl }}</p>
        </ion-item>
        <!-- Language Switch -->
        <ion-item>
          <ion-icon :icon="languageOutline" slot="start"/>
          <ion-label>{{$t("Choose language")}}</ion-label>
          <ion-select interface="popover" :value="locale" @ionChange="switchLocale($event.detail.value)">
            <ion-select-option v-for="locale in Object.keys(locales)" :key="locale" :value="locale" >{{ locales[locale] }}</ion-select-option>
          </ion-select>
        </ion-item>
        <!-- Profile of user logged in -->
        <ion-item>
          <ion-icon :icon="personCircleOutline" slot="start" />
          <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
          <ion-button slot="end" fill="outline" color="dark" @click="logout()">{{ $t("Logout") }}</ion-button>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle , IonToolbar } from '@ionic/vue';
import { defineComponent } from 'vue';
import { ellipsisVertical, personCircleOutline, sendOutline , storefrontOutline, codeWorkingOutline, languageOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Settings',
  components: {
    IonButton, 
    IonContent, 
    IonHeader, 
    IonIcon,
    IonItem, 
    IonLabel, 
    IonList,
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle,
    IonToggle, 
    IonToolbar
  },
  data(){
    return {
      baseURL: process.env.VUE_APP_BASE_URL,
      locales: JSON.parse(process.env.VUE_APP_LOCALES),
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      instanceUrl: 'user/getInstanceUrl',
      showShippingOrders: 'user/showShippingOrders',
      showPackingSlip: 'user/showPackingSlip',
      locale: 'user/getLocale'
    })
  },
  mounted() {
    //
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
    switchLocale(locale: any) {
      this.store.dispatch('user/setLocale', { locale })
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
      languageOutline
    }
  }
});
</script>
