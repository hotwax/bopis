<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="printPicklist()">Print Picklist</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()"/>
    <ion-row v-if="selectedPickers.length">
      <ion-chip v-for="picker in selectedPickers" :key="picker.id">
        <ion-label>{{ picker.name }}</ion-label>
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <div v-if="!currentPickers.length">{{ 'No picker found' }}</div>
      <div v-else>
        <ion-item v-for="(picker, index) in currentPickers" :key="index" @click="pickerChanged(picker.id)">
          <ion-label>{{ picker.name }}</ion-label>
          <ion-checkbox :checked="isPickerSelected(picker.id)"/>
        </ion-item>
      </div>
    </ion-list>
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
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { showToast } from "@/utils";
import { translate } from "@/i18n";

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
  },
  computed: {
    ...mapGetters({
      pickers: 'picklist/getAvailablePickers',
      current: 'user/getUserProfile',
      openOrders: 'order/getOpenOrders'
    })
  },
  data () {
    return {
      selectedPickers: [],
      queryString: '',
      currentPickers: []
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
        this.selectedPickers.push(this.pickers.find((picker) => picker.id == id))
      }
    },
    async searchPicker () {
      this.currentPickers = []
      this.fetchPickers()
    },
    printPicklist () {
      // TODO: update API support to create a picklist
      const payload = this.openOrders;
      if (this.selectedPickers.length) {
        this.store.dispatch('picklist/createPicklist', payload)
      } else {
        showToast(translate('Select a picker'))
      }
    },
    async fetchPickers() {
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
        viewSize: 50,
        entityName: 'PartyRelationshipAndDetail',
        noConditionFind: 'Y',
        orderBy: "firstName ASC",
        filterByDate: "Y",
        distinct: "Y",
        fieldList: ["firstName", "lastName", "partyId"]
      }

      await this.store.dispatch('picklist/updateAvailablePickers', payload)
      this.currentPickers = this.pickers
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.fetchPickers()
    if(this.pickers.length) {
      // making the current user as a picker by default
      this.pickerChanged(this.current.partyId)
    }
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