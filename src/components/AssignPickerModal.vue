<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="readyForPickup()">{{ $t("PACK") }}</ion-button>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-searchbar v-model="queryString" @keyup.enter="searchPicker()"/>
    <ion-row>
      <ion-chip v-for="picker in pickerSelected" :key="picker">
        <ion-label v-if="picker">{{ picker.name }}</ion-label>
        <ion-icon :icon="closeCircle" @click="pickerChanged(picker)" />
      </ion-chip>
    </ion-row>

    <ion-list>
      <ion-list-header>{{ $t("Staff") }}</ion-list-header>
      <!-- TODO: added click event on the item as when using the ionChange event then it's getting
      called every time the v-for loop runs and then removes or adds the currently rendered picker
      -->
      <ion-item v-for="(picker, index) in currentPickers" :key="index" @click="pickerChanged(picker)">
        <ion-label>{{ picker.name }}</ion-label>
        <ion-checkbox :checked="pickerSelected.includes(picker)"/>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script>
import { 
  alertController,
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
import { closeCircle, closeOutline } from "ionicons/icons";
import { mapGetters, useStore } from "vuex";

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
      pickers: 'picklist/getPickers',
      currentFacility: 'user/getCurrentFacility'
    })
  },
  props: ['order', 'shipGroup'],
  data () {
    return {
      pickerSelected: [],
      queryString: '',
      currentPickers: []
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: false });
    },
    pickerChanged (picker) {
      if (!this.pickerSelected.includes(picker)) {
        this.pickerSelected.push(picker)
      } else {
        this.pickerSelected.splice(this.pickerSelected.indexOf(picker), 1);
      }
    },
    searchPicker () {
      this.currentPickers = []
      if (this.queryString.length > 0) {
        this.pickers.map((picker) => {
          if (picker.name.toLowerCase().includes(this.queryString.toLowerCase())) this.currentPickers.push(picker)
        })
      } else {
        this.currentPickers = this.pickers.map((picker) => picker)
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
              const pickerIds = this.pickerSelected.map((picker) => picker.partyId)
              const payload = {
                "facilityId": "STORE_11",
                "shipmentMethodTypeId": "STANDARD",
                "quantity": "1",
                "orderItemSeqId": "00001",
                "orderId": "NN13311",
                "picked": 1,
                "shipGroupSeqId": "00002",
                "inventoryItemId": "39846",
                "itemStatusId": "PICKITEM_PENDING",
                "pickerIds": ["11331", "11330"]
              }
              this.store.dispatch('picklist/createOrderItemPicklist', { payload }).then((resp) => {
                // if (resp.data._EVENT_MESSAGE_) modalController.dismiss({ dismissed: true });
                console.log("first")
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
      facilityId: "STORE_9",
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

<style scoped>
ion-row {
  flex-wrap: nowrap;
  overflow: scroll;
}

ion-chip {
  flex-shrink: 0;
}
</style>