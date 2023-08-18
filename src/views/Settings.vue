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
            <!-- ion-no-padding to remove extra side/horizontal padding as additional padding 
            is added on sides from ion-item and ion-padding-vertical to compensate the removed
            vertical padding -->
            <ion-card-header class="ion-no-padding ion-padding-vertical">
              <ion-card-subtitle>{{ userProfile?.userLoginId }}</ion-card-subtitle>
              <ion-card-title>{{ userProfile?.partyName }}</ion-card-title>
            </ion-card-header>
          </ion-item>
          <ion-button color="danger" @click="logout()">{{ $t("Logout") }}</ion-button>
          <ion-button fill="outline" @click="goToLaunchpad()">
            {{ $t("Go to Launchpad") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
          <!-- Commenting this code as we currently do not have reset password functionality -->
          <!-- <ion-button fill="outline" color="medium">{{ $t("Reset password") }}</ion-button> -->
        </ion-card>
      </div>
      <div class="section-header">
        <h1>{{ $t('OMS') }}</h1>
      </div>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("OMS instance") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ instanceUrl }}
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
            <ion-card-title>
              {{ $t("Facility") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Specify which facility you want to operate from. Order, inventory and other configuration data will be specific to the facility you select.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Select facility") }}</ion-label>
            <ion-select interface="popover" :value="currentFacility?.facilityId" @ionChange="setFacility($event)">
              <ion-select-option v-for="facility in (userProfile ? userProfile.facilities : [])" :key="facility.facilityId" :value="facility.facilityId" >{{ facility.name }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>
              {{ $t("Re-route Fulfillment") }}
            </ion-card-subtitle>
            <ion-card-title>
              {{ $t("Order edit permissions") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Control what your customers are allowed to edit on their order when they are editing their order on Re-route Fulfillment.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Delivery method") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryMethodUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryMethodUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryMethodUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Delivery address") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowDeliveryAddressUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowDeliveryAddressUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowDeliveryAddressUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Pick up location") }}</ion-label>
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowPickupUpdate).length == 0" :checked="rerouteFulfillmentConfig.allowPickupUpdate.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowPickupUpdate, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Cancel order before fulfillment") }}</ion-label>
            <!-- <p>Uploading order cancelations to Shopify is currently disabled. Order cancelations in HotWax will not be synced to Shopify.</p> -->
            <ion-toggle :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.allowCancel).length == 0" :checked="rerouteFulfillmentConfig.allowCancel.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.allowCancel, $event.detail.checked)" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label>{{ $t("Shipment method") }}</ion-label>
            <ion-select :disabled="!hasPermission(Actions.APP_RF_CONFIG_UPDATE) || Object.keys(rerouteFulfillmentConfig.shippingMethod).length == 0" interface="popover" :value="rerouteFulfillmentConfig.shippingMethod.settingValue" @ionChange="updateRerouteFulfillmentConfiguration(rerouteFulfillmentConfig.shippingMethod, $event.detail.value)">
              <ion-select-option v-for="shipmentMethod in availableShipmentMethods" :key="shipmentMethod.shipmentMethodTypeId" :value="shipmentMethod.shipmentMethodTypeId" >{{ shipmentMethod.description }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>
        
      </section>

      <hr />
      <div class="section-header">
        <h1>
          {{ $t('App') }}
          <p class="overline">{{ "Version: " + appVersion }}</p>
        </h1>
        <p class="overline">{{ "Built: " + getDateTime(appInfo.builtTime) }}</p>
      </div>

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

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Language") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Select your preferred language.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Choose language") }}</ion-label>
            <ion-select interface="popover" :value="locale" @ionChange="setLocale($event.detail.value)">
              <ion-select-option v-for="locale in Object.keys(locales)" :key="locale" :value="locale" >{{ locales[locale] }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Shipping orders") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('View shipping orders along with pickup orders.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Show shipping orders") }}</ion-label>
            <ion-toggle :checked="showShippingOrders" @ionChange="setShowShippingOrdersPreference($event)" slot="end" />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Packing Slip") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Packing slips help customer reconcile their order against the delivered items.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Generate packing slips") }}</ion-label>
            <ion-toggle :checked="showPackingSlip" @ionChange="setShowPackingSlipPreference($event)" slot="end" />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t("Track Pickers") }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ $t('Track who picked orders by entering picker IDs when packing an order.') }}
          </ion-card-content>
          <ion-item lines="none">
            <ion-label>{{ $t("Enable tracking") }}</ion-label>
            <ion-toggle :checked="configurePicker" @ionChange="setConfigurePickerPreference($event)" slot="end" />
          </ion-item>
        </ion-card>

        <!-- Product Identifier -->

        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ $t('Product Identifier') }}
            </ion-card-title>
          </ion-card-header>

          <ion-card-content>
            {{ $t('Choosing a product identifier allows you to view products with your preferred identifiers.') }}
          </ion-card-content>

          <ion-item>
            <ion-label>{{ $t("Primary Product Identifier") }}</ion-label>
            <ion-select interface="popover" :placeholder="$t('primary identifier')" :value="productIdentificationPref.primaryId" @ionChange.="setProductIdentificationPref($event.detail.value, 'primaryId')">
              <ion-select-option v-for="identification in productIdentificationOptions" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Secondary Product Identifier") }}</ion-label>
            <ion-select interface="popover" :placeholder="$t('secondary identifier')" :value="productIdentificationPref.secondaryId" @ionChange="setProductIdentificationPref($event.detail.value, 'secondaryId')">
              <ion-select-option v-for="identification in productIdentificationOptions" :key="identification" :value="identification" >{{ identification }}</ion-select-option>
              <ion-select-option value="">{{ $t("None") }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card>

      </section>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { IonAvatar, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonTitle, IonToggle , IonToolbar, modalController } from '@ionic/vue';
import { defineComponent, inject } from 'vue';
import { ellipsisVertical, personCircleOutline, sendOutline , storefrontOutline, codeWorkingOutline, openOutline } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex';
import { useRouter } from 'vue-router';
import TimeZoneModal from './TimezoneModal.vue';
import Image from '@/components/Image.vue';
import { DateTime } from 'luxon';
import { UserService } from '@/services/UserService'
import { showToast } from '@/utils';
import { hasError } from '@/adapter'
import { translate } from "@/i18n";
import { Actions, hasPermission } from '@/authorization'
import { useProductIdentificationStore } from '@hotwax/dxp-components';

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
      baseURL: process.env.VUE_APP_BASE_URL,
      appInfo: (process.env.VUE_APP_VERSION_INFO ? JSON.parse(process.env.VUE_APP_VERSION_INFO) : {}) as any,
      appVersion: "",
      locales: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : {"en": "English"},
      rerouteFulfillmentConfig: {
        // TODO Remove fromDate and directly store values making it loosely coupled with OMS
        allowDeliveryMethodUpdate: {},
        allowDeliveryAddressUpdate: {},
        allowPickupUpdate: {},
        allowCancel: {},
        shippingMethod: {}
      } as any,
      availableShipmentMethods: [] as any,
      rerouteFulfillmentConfigMapping: (process.env.VUE_APP_RF_CNFG_MPNG? JSON.parse(process.env.VUE_APP_RF_CNFG_MPNG) : {}) as any
    }
  },
  computed: {
    ...mapGetters({
      userProfile: 'user/getUserProfile',
      currentFacility: 'user/getCurrentFacility',
      currentEComStore: 'user/getCurrentEComStore',
      instanceUrl: 'user/getInstanceUrl',
      configurePicker: "user/configurePicker",
      showShippingOrders: 'user/showShippingOrders',
      showPackingSlip: 'user/showPackingSlip',
      locale: 'user/getLocale'
    })
  },
  mounted() {
    this.appVersion = this.appInfo.branch ? (this.appInfo.branch + "-" + this.appInfo.revision) : this.appInfo.tag;
  },
  ionViewWillEnter() {
    // Only fetch configuration when environment mapping exists
    if (Object.keys(this.rerouteFulfillmentConfigMapping).length > 0) {
      this.getAvailableShipmentMethods();
      this.getRerouteFulfillmentConfiguration();
    }
  },
  methods: {
    setFacility (event: any) {
      // If the value is same, no need to update
      // Handled case for programmatical changes
      // https://github.com/ionic-team/ionic-framework/discussions/25532
      // https://github.com/ionic-team/ionic-framework/issues/20106
      // https://github.com/ionic-team/ionic-framework/pull/25858
      if (this.userProfile && this.currentFacility?.facilityId !== event.detail.value)
        this.store.dispatch('user/setFacility', {
          'facilityId': event.detail.value
        });
    },
    async changeTimeZone() {
      const timeZoneModal = await modalController.create({
        component: TimeZoneModal,
      });
      return timeZoneModal.present();
    },
    logout () {
      this.store.dispatch('user/logout').then(() => {
        const redirectUrl = window.location.origin + '/login'
        window.location.href = `${process.env.VUE_APP_LOGIN_URL}?isLoggedOut=true&redirectUrl=${redirectUrl}`
      })
    },
    goToLaunchpad() {
      window.location.href = `${process.env.VUE_APP_LOGIN_URL}`
    },
    setShowShippingOrdersPreference (ev: any) {
      this.store.dispatch('user/setUserPreference', { showShippingOrders: ev.detail.checked })
    },
    setShowPackingSlipPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { showPackingSlip: ev.detail.checked })
    },
    setConfigurePickerPreference (ev: any){
      this.store.dispatch('user/setUserPreference', { configurePicker: ev.detail.checked })
    },
    goToOms(){
      window.open(this.instanceUrl.startsWith('http') ? this.instanceUrl.replace('api/', "") : `https://${this.instanceUrl}.hotwax.io/`, '_blank', 'noopener, noreferrer');
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    setLocale(locale: string) {
      this.store.dispatch('user/setLocale',locale)
    },
    async getAvailableShipmentMethods () {
      this.availableShipmentMethods = [];
      try {
        const resp = await UserService.getRerouteFulfillmentConfig({
          "inputFields": {
            "productStoreId": this.currentEComStore?.productStoreId,
            "shipmentMethodTypeId": "STOREPICKUP",
            "shipmentMethodTypeId_op": "notEqual"
          },
          "filterByDate": 'Y',
          "entityName": "ProductStoreShipmentMethView",
          "fieldList": ["shipmentMethodTypeId", "description"],
          "viewSize": 10
        }) as any;
        if (!hasError(resp) && resp.data?.docs) {
          this.availableShipmentMethods = resp.data.docs;
        }
      } catch(err) {
        console.error(err)
      }
    },
    async getRerouteFulfillmentConfiguration(settingTypeEnumId?: any) {
      try {
        const payload = {
          "inputFields": {
            "productStoreId": this.currentEComStore?.productStoreId,
            settingTypeEnumId
          },
          "filterByDate": 'Y',
          "entityName": "ProductStoreSetting",
          "fieldList": ["settingTypeEnumId", "settingValue", "fromDate"],
          "viewSize": 5
        } as any

        // get all values
        if (!payload.inputFields.settingTypeEnumId) {
          payload.inputFields.settingTypeEnumId = Object.values(this.rerouteFulfillmentConfigMapping);
          payload.inputFields.settingTypeEnumId_op = "in"

        }

        const resp = await UserService.getRerouteFulfillmentConfig(payload) as any
        if (!hasError(resp) && resp.data?.docs) {
          const rerouteFulfillmentConfigMappingFlipped = Object.fromEntries(Object.entries(this.rerouteFulfillmentConfigMapping).map(([key, value]) => [value, key])) as any;
          resp.data.docs.map((config: any) => {
            this.rerouteFulfillmentConfig[rerouteFulfillmentConfigMappingFlipped[config.settingTypeEnumId]] = config;
          })
        }
      } catch(err) {
        console.error(err)
      }
    },
    async updateRerouteFulfillmentConfiguration(config: any, value: any) {
      // Handled initial programmatical update
      // When storing boolean values, it is stored as string. Further comparison needs conversion
      if (config.settingValue === value || (typeof value === 'boolean' && (config.settingValue == 'true') === value)) {
        return;
      }
      
      const params = {
        "fromDate": config.fromDate,
        "productStoreId": this.currentEComStore?.productStoreId,
        "settingTypeEnumId": config.settingTypeEnumId,
        "settingValue": value
      }

      try {
        const resp = await UserService.updateRerouteFulfillmentConfig(params) as any
        if(!hasError(resp)) {
          showToast(translate('Configuration updated'))
        } else {
          showToast(translate('Failed to update configuration'))
        }
      } catch(err) {
        showToast(translate('Failed to update configuration'))
        console.error(err)
      }
      // Fetch the updated configuration
      await this.getRerouteFulfillmentConfiguration(config.settingTypeEnumId);
    }
  },
  setup () {
    const store = useStore();
    const router = useRouter();

    /* Start Product Identifier */

    const productIdentificationStore = useProductIdentificationStore();
    const productIdentificationOptions = productIdentificationStore.getProductIdentificationOptions;

    // Injecting identifier preference from app.view
    const productIdentificationPref: any  = inject("productIdentificationPref");

    // Function to set the value of productIdentificationPref using dxp-component
    const setProductIdentificationPref = (value: string, id: string) =>  {
      const eComStore = store.getters['user/getCurrentEComStore']; 

      // If productPreference value is same as ion change value then not calling the set function as there is no cahnge 
      if(eComStore.productStoreId && (productIdentificationPref.value[id] !== value)){
        productIdentificationStore.setProductIdentificationPref(id, value, eComStore.productStoreId)
          .then(() => {
            showToast("Product identifier preference updated");
          })
          .catch(error => console.log(error)); 
      } 
    }

    /* End Product Identifier */

    return {
      Actions,
      ellipsisVertical,
      hasPermission,
      personCircleOutline,
      router,
      sendOutline,
      store,
      storefrontOutline,
      codeWorkingOutline,
      openOutline,
      productIdentificationPref,
      setProductIdentificationPref,
      productIdentificationOptions,
      productIdentificationStore
    }
  }
});
</script>

<style scoped>
  ion-card > ion-button {
    margin: var(--spacer-xs);
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
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacer-xs) 10px 0px;
  }
  ion-content {
    --padding-bottom: 80px;
  }
</style>
