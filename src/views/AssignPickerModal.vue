<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="readyForPickup()">{{ order.parts[0].shipmentMethodEnum?.shipmentMethodEnumId === 'STOREPICKUP' ? $t("Ready for pickup") : $t("Ready to ship") }}</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()"/>

    <div class="ion-text-center ion-margin-top" v-if="!availablePickers.length">{{ 'No picker found' }}</div>

    <ion-list v-else>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <div>
        <ion-radio-group v-model="selectedPicker">
          <ion-item v-for="(picker, index) in availablePickers" :key="index">
            <ion-label>{{ picker.name }}</ion-label>
            <ion-radio slot="end" :value="picker.id" ></ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>
    <ion-infinite-scroll
      @ionInfinite="loadMorePickers($event)"
      threshold="100px"
      :disabled="!isScrollable"
    >
      <ion-infinite-scroll-content
        loading-spinner="crescent"
        :loading-text="$t('Loading')"
      />
    </ion-infinite-scroll>
  </ion-content>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { hasError, showToast } from "@/utils";
import { translate } from "@/i18n";
import { PicklistService } from '@/services/PicklistService'

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRadio,
    IonRadioGroup,
    IonSearchbar,
    IonTitle,
    IonToolbar,
    IonInfiniteScroll,
    IonInfiniteScrollContent
  },
  computed: {
    ...mapGetters({
      openOrders: 'order/getOpenOrders'
    })
  },
  props: ['order'],
  data () {
    return {
      selectedPicker: '',
      queryString: '',
      availablePickers: [],
      isScrollable: true
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async searchPicker () {
      this.availablePickers = []
      this.fetchPickers()
    },
    readyForPickup () {
      if (this.selectedPicker.length) {
        this.store.dispatch('picklist/createPicklist', { order: this.order, selectedPicker: this.selectedPicker })
        modalController.dismiss({ dismissed: true });
      } else {
        showToast(translate('Select a picker'))
      }
    },
    async loadMorePickers(event) {
      this.fetchPickers(
        undefined,
        Math.ceil(
          this.availablePickers.length / (process.env.VUE_APP_VIEW_SIZE)
        ).toString()
      ).then(() => {
        event.target.complete();
      });
    },
    async fetchPickers(vSize, vIndex) {
      let inputFields = {}

      if(this.queryString.length > 0) {
        // TODO: having issue when creating more than 2 groups in performFind, searching always work on first two groups
        // For now enabled searching on first name and externalId
        inputFields = {
          firstName_fld0_value: this.queryString,
          firstName_fld0_op: 'contains',
          firstName_fld0_ic: 'Y',
          firstName_fld0_grp: '1',
          externalId_fld1_value: this.queryString,
          externalId_fld1_op: 'contains',
          externalId_fld1_ic: 'Y',
          externalId_fld1_grp: '2',
          // lastName_fld2_value: this.queryString,
          // lastName_fld2_op: 'contains',
          // lastName_fld2_ic: 'Y',
          // lastName_fld2_grp: '3',
          // partyId_fld3_value: this.queryString,
          // partyId_fld3_op: 'contains',
          // partyId_fld3_ic: 'Y',
          // partyId_fld3_grp: '4',
        }
      }

      const payload = {
        inputFields: {
          ...inputFields,
          roleTypeIdTo: 'WAREHOUSE_PICKER'
        },
        viewSize: vSize ? vSize : process.env.VUE_APP_VIEW_SIZE,
        viewIndex: vIndex ? vIndex : 0,
        entityName: 'PartyRelationshipAndDetail',
        noConditionFind: 'Y',
        orderBy: "firstName ASC",
        filterByDate: "Y",
        distinct: "Y",
        fieldList: ["firstName", "lastName", "partyId"]
      }
      let resp;
      let total = 0;
      
      try {
        resp = await PicklistService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data.count > 0) {
          const pickers = resp.data.docs.map((picker) => ({
            name: picker.firstName+ ' ' +picker.lastName,
            id: picker.partyId
          }))
          this.availablePickers = this.availablePickers.concat(pickers);
          total = resp.data.count;
        } else {
          console.error(translate('Something went wrong'))
          this.availablePickers = [];
        }
      } catch (err) {
        console.error(translate('Something went wrong'))
        this.availablePickers = [];
      }
      this.isScrollable = this.availablePickers.length < total;
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.fetchPickers();
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store
    };
  },
});
</script>

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}

ion-chip {
  flex-shrink: 0;
}
</style>