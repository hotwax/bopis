<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="close" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Edit pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; findPickers()" />

    <ion-list>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div class="ion-padding" v-if="!availablePickers.length">
        {{ translate("No picker found") }}
      </div>
      <div v-else>
        <ion-radio-group :value="selectedPicker.id">
          <ion-item v-for="(picker, index) in availablePickers" :key="index" @click="updateSelectedPicker(picker.id)">
            <ion-label>
              {{ picker.name }}
              <p>{{ picker.id }}</p>
            </ion-label>
            <ion-radio slot="end" :value="picker.id" ></ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button :disabled="isPickerAlreadySelected()" @click="confirmSave()">
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonFab,
  IonFabButton,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonItem,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  alertController,
  modalController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { close, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { showToast } from '@/utils';
import { hasError } from '@/adapter'
import { translate } from '@hotwax/dxp-components'
import { UtilService } from "@/services/UtilService";
import { PicklistService } from "@/services/PicklistService";

export default defineComponent({
  name: "EditPickersModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonFab,
    IonFabButton,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonToolbar,
    IonRadio,
    IonRadioGroup,
    IonSearchbar
  },
  data () {
    return {
      availablePickers: [] as any,
      queryString: '',
      selectedPicker: {} as any,
      selectedPickerId: this.order.pickerIds[0]
    }
  },
  async mounted() {
    await this.findPickers()
    this.getAlreadyAssignedPicker()
  },
  props: ['order'],
  methods: {
    updateSelectedPicker(id: string) {
      this.selectedPicker = this.availablePickers.find((picker: any) => picker.id == id)
    },
    async findPickers() {
      let inputFields = {}
      this.availablePickers = []

      if (this.queryString.length > 0) {
        inputFields = {
          firstName_value: this.queryString,
          firstName_op: 'contains',
          firstName_ic: 'Y',
          firstName_grp: '1',
          lastName_value: this.queryString,
          lastName_op: 'contains',
          lastName_ic: 'Y',
          lastName_grp: '2',
          partyId_value: this.queryString,
          partyId_op: 'contains',
          partyId_ic: 'Y',
          partyId_grp: '3',
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
      
      try {
        const resp = await PicklistService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp)) {
          this.availablePickers = resp.data.docs.map((picker: any) => ({
            name: picker.firstName + ' ' + picker.lastName,
            id: picker.partyId
          }))
        } else {
          throw resp.data
        }
      } catch (err) {
        console.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
    },
    async confirmSave() {
      const message = translate("Replace current pickers with new selection?");
      const alert = await alertController.create({
        header: translate("Replace pickers"),
        message,
        buttons: [
          {
            text: translate("Cancel"),
          },
          {
            text: translate("Replace"),
            handler: () => {
              this.resetPicker().then(() => {
                this.closeModal()
              })
            }
          }
        ],
      });
      return alert.present();
    },
    async resetPicker() {
      const pickerIds = this.selectedPicker.id
      // Api call to remove already selected picker and assign new picker
      try {
        const resp = await UtilService.resetPicker({
          pickerIds,
          picklistId: this.order.picklistId
        });

        if (resp.status === 200 && !hasError(resp)) {
          showToast(translate("Pickers successfully replaced in the picklist with the new selections."))
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Something went wrong, could not edit picker.'))
        console.error('Something went wrong, could not edit picker')
      }
    },
    closeModal() {
      modalController.dismiss({ selectedPicker: this.selectedPicker });
    },
    getAlreadyAssignedPicker() {
      this.selectedPicker = this.availablePickers.find((picker: any) => this.selectedPickerId === picker.id)
    },
    isPickerAlreadySelected() {
      return this.selectedPicker.id === this.selectedPickerId
    }
  },
  setup() {
    const store = useStore();
    return {
      close,
      saveOutline,
      store,
      translate
    };
  }
});
</script>