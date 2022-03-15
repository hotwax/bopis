<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t("Assign Pickers") }}</ion-title>
      <ion-button fill="clear" slot="end" @click="packOrder()">{{ $t("pack") }}</ion-button>
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
import { PicklistService } from '@/services/PicklistService'
import { hasError, showToast } from '@/utils'

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
    searchPicker (pickers: any) {
      // this.pickerList = []
      if (this.queryString.length > 0) {
        this.pickerList = pickers.filter((picker: any) => {
          return picker.name.toLowerCase().includes(this.queryString.toLowerCase())
        })
      } else {
        this.pickerList = pickers;
      }
    },
    async packOrder() {
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
              this.createOrderItemPicklist({ facilityId: this.currentFacility.facilityId, order: this.order, pickerId: this.selectedPickerId })
              .then((resp: any) => {
                if (resp) modalController.dismiss({ dismissed: true });
              })
            }
          }]
        });
      return alert.present();
    },
    async fetchPickers() {
      const payload = {
        vSize: 50,
        vIndex: 0,
        facilityId: this.currentFacility.facilityId,
        roleTypeId: 'WAREHOUSE_PICKE'
      }

      let resp;
      try {
        resp = await PicklistService.getPickers(payload);
        if(resp.status === 200 && resp.data.count > 0 && !hasError(resp)) {
          this.searchPicker({ pickers: resp.data.docs });
        } else {
          showToast(this.$t('Pickers not found'))
        }
      } catch (err) {
        console.error(this.$t('Something went wrong'))
      }
      return resp;
    },
    async createOrderItemPicklist(payload: any) {
      try {

        const params = {
          "payload": {
            "facilityId": payload.facilityId,
            "orderId": payload.order?.orderId,
            "shipmentMethodTypeId": "",
            "item": {
              "orderItemSeqId": "",
              "pickerId": "",
              "quantity": ""
            }
          } as any
        }

        const response = payload.order?.items.map((item: any) => {
          params.payload.shipmentMethodTypeId = item.shipmentMethodTypeId;
          params.payload.item.orderItemSeqId = item.orderItemSeqId;
          params.payload.item.pickerId = payload.pickerId;
          // TODO: Add dynamic quantity for quantity property
          params.payload.item.quantity = 1

          return PicklistService.createOrderItemPicklist(params)
        })

        return Promise.all(response).then((resp) => {
          if(resp.length === payload.order?.items.length) {

            const isPicklistCreated = resp.some((res: any) => (res.status === 200 && res.data?._EVENT_MESSAGE_));

            if(!isPicklistCreated) showToast(this.$t("Can not create picklist"));

            // return isPicklistCreated;
          } else {
            showToast(this.$t("Can not create picklist for each item"));
          }
        })
      } catch(err) {
        showToast(this.$t("Something went wrong"));
        console.error(err);
      }
    }
  },
  mounted() {
    this.fetchPickers();
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
