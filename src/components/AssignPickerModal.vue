<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="readyForPickup()">{{ $t("pack") }}</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="searchPicker()"/>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <ion-radio-group allow-empty-selection="true" :value="selectedPickerId" @ionChange="pickerChanged($event.detail.value)">
        <ion-item v-for="(picker, index) in pickerList" :key="index" >
          <ion-label>{{ picker.name }}</ion-label>
          <ion-radio :value="picker.partyId" />
        </ion-item>
      </ion-radio-group>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import { 
  alertController,
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
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeCircle, closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";

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
  },
  computed: {
    ...mapGetters({
      pickers: 'picklist/getPickers',
      currentFacility: 'user/getCurrentFacility'
    })
  },
  props: ['order'],
  data () {
    return {
      selectedPickerId: "",
      queryString: '',
      pickerList: []
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: false });
    },
    pickerChanged (selectedPickerId: string) {
      this.selectedPickerId = selectedPickerId
    },
    searchPicker () {
      this.pickerList = []
      if (this.queryString.length > 0) {
        this.pickerList = this.pickers.filter((picker: any) => {          
          return picker.name.toLowerCase().includes(this.queryString.toLowerCase())
        })
      } else {
        this.pickerList = this.pickers.map((picker: any) => picker)
      }
    },
    async readyForPickup () {
      const alert = await alertController
        .create({
          header: this.$t('Ready for pickup'),
          message: this.$t('An email notification will be sent to that their order is ready for pickup. This order will also be moved to the packed orders tab.', { customerName: this.order.customerName, space: '<br/><br/>'}),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          },{
            text: this.$t('Ready for pickup'),
            handler: () => {
              this.store.dispatch('picklist/createOrderItemPicklist', { facilityId: this.currentFacility.facilityId, order: this.order, pickerId: this.selectedPickerId }).then((resp) => {
                if (resp) modalController.dismiss({ dismissed: true });
              })
            }
          }]
        });
      return alert.present();
    }
  },
  mounted() {
    this.store.dispatch('picklist/getPickers', {
      vSize: 50,
      vIndex: 0,
      facilityId: this.currentFacility.facilityId,
      roleTypeId: 'WAREHOUSE_PICKER'
    })  
    .then(() => {
      this.searchPicker()
    })
  },
  setup() {
    const store = useStore();

    return {
      closeCircle,
      closeOutline,
      store
    };
  },
});
</script>
