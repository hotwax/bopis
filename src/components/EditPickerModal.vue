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

  <ion-content class="ion-padding" ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()" />

    <ion-list>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div v-if="isLoading" class="empty-state">
        <ion-spinner name="crescent" />
        <ion-label>{{ translate("Fetching pickers") }}</ion-label>
      </div>
      <div class="empty-state" v-else-if="!availablePickers.length">{{ translate('No picker found') }}</div>

      <div v-else>
        <ion-radio-group :value="selectedPicker?.id">
          <ion-item v-for="(picker, index) in availablePickers" :key="index" @click="updateSelectedPicker(picker.id)">
            <ion-radio :value="picker.id">
              <ion-label>
                {{ picker.name }}
                <p>{{ picker.id }}</p>
              </ion-label>
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>

    <ion-infinite-scroll
      @ionInfinite="loadMorePickers($event)"
      threshold="100px"
      v-show="isScrollable"
      ref="infiniteScrollRef"
    >
      <ion-infinite-scroll-content
        loading-spinner="crescent"
        :loading-text="translate('Loading')"
      />
    </ion-infinite-scroll>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button :disabled="isPickerAlreadySelected()" @click="confirmSave()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
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
import logger from "@/logger";

export default defineComponent({
  name: "EditPickerModal",
  components: { 
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
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
    IonSearchbar,
    IonSpinner
  },
  data () {
    return {
      availablePickers: [] as any,
      queryString: '',
      selectedPicker: {} as any,
      selectedPickerId: this.order.pickerIds[0],
      isLoading: false,
      isScrollable: true,
      isScrollingEnabled: false,
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
    enableScrolling() {
      const parentElement = (this as any).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("div[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this as any).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMorePickers(event: any) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isScrollable)) {
        await event.target.complete();
      }
      this.findPickers(
        undefined,
        Math.ceil(
          this.availablePickers.length / (process.env.VUE_APP_VIEW_SIZE)
        ).toString()
      ).then(async () => {
        await event.target.complete();
        this.getAlreadyAssignedPicker();
      });
    },
    async searchPicker() {
      this.availablePickers = []
      this.findPickers()
    },
    async findPickers(vSize?: any, vIndex?: any) {
      if(!vIndex) this.isLoading = true;
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      let query = {}

      if(this.queryString.length > 0) {
        let keyword = this.queryString.trim().split(' ')
        query = `(${keyword.map(key => `*${key}*`).join(' OR ')}) OR "${this.queryString}"^100`;
      }
      else {
        query = `*:*`
      }

      const payload = {
        "json": {
          "params": {
            "rows": viewSize,
            "start": viewSize*vIndex,
            "q": query,
            "defType" : "edismax",
            "qf": "firstName lastName groupName partyId externalId",
            "sort": "firstName asc"
          },
          "filter": ["docType:EMPLOYEE", "WAREHOUSE_PICKER_role:true"]
        }
      }
      let total = 0;

      try {
        const resp = await PicklistService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data.response.docs.length > 0) {
          const pickers = resp.data.response.docs.map((picker: any) => ({
            name: picker.groupName ? picker.groupName : (picker.firstName || picker.lastName)
                ? (picker.firstName ? picker.firstName : '') + (picker.lastName ? ' ' + picker.lastName : '') : picker.partyId,
            id: picker.partyId,
            externalId: picker.externalId
          }))
          this.availablePickers = this.availablePickers.concat(pickers);
          total = resp.data.response?.numFound;
        } else {
          throw resp.data;
        }
      } catch (err) {
        logger.error('Failed to fetch the pickers information or there are no pickers available', err)
      }
      this.isScrollable = this.availablePickers.length < total;
      this.isLoading = false;
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
                this.closeModal({ selectedPicker: this.selectedPicker })
              })
            }
          }
        ],
      });
      return alert.present();
    },
    async resetPicker() {
      const pickerId = this.selectedPicker.id
      // Api call to remove already selected picker and assign new picker
      try {
        const resp = await UtilService.resetPicker({
          pickerIds: pickerId,
          picklistId: this.order.picklistId
        });

        if (resp.status === 200 && !hasError(resp)) {
          showToast(translate("Pickers successfully replaced in the picklist with the new selections."))
        } else {
          throw resp.data
        }
      } catch (err) {
        showToast(translate('Something went wrong, could not edit picker.'))
        logger.error('Something went wrong, could not edit picker')
      }
    },
    closeModal(payload = {}) {
      modalController.dismiss({ dismissed: true, ...payload });
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