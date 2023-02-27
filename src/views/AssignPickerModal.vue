<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="readyForPickup()">Ready for pickup</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()"/>
    <ion-row v-if="selectedPickers.length">
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
      </ion-chip>
    </ion-row>

    <div class="ion-text-center ion-margin-top" v-if="!availablePickers.length">{{ 'No picker found' }}</div>

    <ion-list v-else>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <div>
        <ion-item v-for="(picker, index) in availablePickers" :key="index" @click="pickerChanged(picker.id)">
          <ion-label>{{ picker.name }}</ion-label>
          <ion-checkbox :checked="isPickerSelected(picker.id)"/>
        </ion-item>
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
  IonCheckbox,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRow,
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
    IonCheckbox,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonRow,
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
      selectedPickers: [],
      queryString: '',
      availablePickers: [],
      isScrollable: true
    }
  },
  methods: {
    isPickerSelected(id) {
      return this.selectedPickers.some((picker) => picker.id == id)
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    pickerChanged(id) {
      const picker = this.selectedPickers.some((picker) => picker.id == id)
      if (picker) {
        // if picker is already selected then removing that picker from the list on click
        this.selectedPickers = this.selectedPickers.filter((picker) => picker.id != id)
      } else {
        this.selectedPickers.push(this.availablePickers.find((picker) => picker.id == id))
      }
    },
    async searchPicker () {
      this.availablePickers = []
      this.fetchPickers()
    },
    readyForPickup () {
      // TODO: update API support to create a picklist
      const payload = this.order;
      if (this.selectedPickers.length) {
        this.store.dispatch('picklist/createPicklist', payload)
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