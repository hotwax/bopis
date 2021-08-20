<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Settings") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <!-- Profile of user logged in -->
      <ion-item>
        <ion-icon :icon="personCircleOutline" slot="start" />
        <ion-label>{{ userProfile !== null ? userProfile.partyName : '' }}</ion-label>
        <ion-button slot="end" fill="outline" color="dark" @click="logout()">{{ $t("Logout") }}</ion-button>
      </ion-item>

      <!-- Select store -->
       <ion-item>
        <ion-icon :icon="storefrontOutline" slot="start" />
        <ion-label>{{ currentFacility.facilityId ? currentFacility.facilityId : '' }}</ion-label>
      <ion-select interface="popover" :placeholder="$t('store name')" :selected-text="currentFacility.facilityId" @ionChange="setFacility($event)">
        <ion-select-option v-for="facility in userProfile.facilities" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.facilityId }}</ion-select-option>
      </ion-select>
      </ion-item>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { alertController, IonButton, IonContent, IonHeader,IonIcon, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonTitle, IonToolbar, popoverController } from '@ionic/vue';
import { defineComponent } from 'vue';
import { ellipsisVertical, personCircleOutline, storefrontOutline} from 'ionicons/icons'
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
    IonPage, 
    IonSelect, 
    IonSelectOption,
    IonTitle, 
    IonToolbar
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
    })
  },
  methods: {
    setFacility (facility: any) {
      this.userProfile.facilities.map((fac: any) => {
        if (fac.facilityId == facility['detail'].value) {
          this.store.dispatch('user/setFacility', {'facility': fac});
          console.log(fac);
        }
      })
    },
    async presentAlert () {
      const alert = await alertController.create({
        header: this.$t('Logout'),
        message: this.$t('The products in the upload list will be removed.'),
        buttons: [{
          text: this.$t('Cancel')
        },
        {
          text: this.$t('Ok'),
          handler: () => {
            this.store.dispatch('product/clearUploadProducts');
            this.store.dispatch('user/logout').then(() => {
            this.router.push('/login');
            })
          }
        }]
      });
      await alert.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        this.router.push('/login');
      })
    }
  },
  setup(){
    const store = useStore();
    const router = useRouter();

    return {
      ellipsisVertical,
      personCircleOutline,
      storefrontOutline,
      store,
      router
    }
  }
});
</script>