<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal"> 
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Assign Pickers") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content ref="contentRef" :scroll-events="true" @ionScroll="enableScrolling()">
    <ion-searchbar v-model="queryString" @keyup.enter="queryString = $event.target.value; searchPicker()"/>

    <div v-if="isLoading" class="empty-state">
      <ion-spinner name="crescent" />
      <ion-label>{{ translate("Fetching pickers") }}</ion-label>
    </div>
    <div class="empty-state" v-else-if="!availablePickers.length">{{ translate('No picker found') }}</div>

    <ion-list v-else>
      <ion-list-header>{{ translate("Staff") }}</ion-list-header>
      <div>
        <ion-radio-group v-model="selectedPicker">
          <ion-item v-for="(picker, index) in availablePickers" :key="index">
            <ion-radio :value="picker.id">{{ picker.name }}</ion-radio>
          </ion-item>
        </ion-radio-group>
      </div>
    </ion-list>
     <!--
        When searching for a keyword, and if the user moves to the last item, then the didFire value inside infinite scroll becomes true and thus the infinite scroll does not trigger again on the same page(https://github.com/hotwax/users/issues/84).
        Also if we are at the section that has been loaded by infinite-scroll and then move to the details page then the list infinite scroll does not work after coming back to the page
        In ionic v7.6.0, an issue related to infinite scroll has been fixed that when more items can be added to the DOM, but infinite scroll does not fire as the window is not completely filled with the content(https://github.com/ionic-team/ionic-framework/issues/18071).
        The above fix in ionic 7.6.0 is resulting in the issue of infinite scroll not being called again.
        To fix this we have maintained another variable `isScrollingEnabled` to check whether the scrolling can be performed or not.
        If we do not define an extra variable and just use v-show to check for `isScrollable` then when coming back to the page infinite-scroll is called programatically.
        We have added an ionScroll event on ionContent to check whether the infiniteScroll can be enabled or not by toggling the value of isScrollingEnabled whenever the height < 0.
      -->
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
    <ion-fab-button @click="readyForPickup()">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script>
import { 
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { showToast } from "@/utils";
import { hasError } from '@/adapter'
import { translate } from "@hotwax/dxp-components";
import { PicklistService } from '@/services/PicklistService'
import logger from '@/logger'

export default defineComponent({
  name: "AssignPickerModal",
  components: { 
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
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
    IonInfiniteScroll,
    IonInfiniteScrollContent
  },
  props: ['order', 'part', 'facilityId'],
  data () {
    return {
      selectedPicker: '',
      queryString: '',
      availablePickers: [],
      isScrollable: true,
      isScrollingEnabled: false,
      isLoading: false
    }
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async searchPicker () {
      this.availablePickers = []
      this.getPicker()
    },
    readyForPickup () {
      if (this.selectedPicker) {
        modalController.dismiss({ dismissed: true, selectedPicker: this.selectedPicker });
      } else {
        showToast(translate('Select a picker'))
      }
    },
    enableScrolling() {
      const parentElement = (this).$refs.contentRef.$el
      const scrollEl = parentElement.shadowRoot.querySelector("main[part='scroll']")
      let scrollHeight = scrollEl.scrollHeight, infiniteHeight = (this).$refs.infiniteScrollRef.$el.offsetHeight, scrollTop = scrollEl.scrollTop, threshold = 100, height = scrollEl.offsetHeight
      const distanceFromInfinite = scrollHeight - infiniteHeight - scrollTop - threshold - height
      if(distanceFromInfinite < 0) {
        this.isScrollingEnabled = false;
      } else {
        this.isScrollingEnabled = true;
      }
    },
    async loadMorePickers(event) {
      // Added this check here as if added on infinite-scroll component the Loading content does not gets displayed
      if(!(this.isScrollingEnabled && this.isScrollable)) {
        await event.target.complete();
      }
      this.getPicker(
        undefined,
        Math.ceil(
          this.availablePickers.length / (process.env.VUE_APP_VIEW_SIZE)
        ).toString()
      ).then(async () => {
        await event.target.complete();
      });
    },
    async getPicker(vSize, vIndex) {
      if(!vIndex) this.isLoading = true;
      let inputFields = {}

      if(this.queryString.length > 0) {

        inputFields = {
          firstName_value: this.queryString,
          firstName_op: 'contains',
          firstName_ic: 'Y',
          firstName_grp: '1',
          externalId_value: this.queryString,
          externalId_op: 'contains',
          externalId_ic: 'Y',
          externalId_grp: '2',
          lastName_value: this.queryString,
          lastName_op: 'contains',
          lastName_ic: 'Y',
          lastName_grp: '3',
          partyId_value: this.queryString,
          partyId_op: 'contains',
          partyId_ic: 'Y',
          partyId_grp: '4',
          groupName_value: this.queryString,
          groupName_op: 'contains',
          groupName_ic: 'Y',
          groupName_grp: '5'
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
        fieldList: ["firstName", "lastName", "partyId", "groupName"]
      }
      let resp;
      let total = 0;
      
      try {
        resp = await PicklistService.getAvailablePickers(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data.docs.length > 0) {
          const pickers = resp.data.docs.map((picker) => ({
            name: picker.groupName ? picker.groupName : `${picker.firstName} ${picker.lastName}`,  
            id: picker.partyId
          }))
          this.availablePickers = this.availablePickers.concat(pickers);
          total = resp.data.count;
        } else {
          logger.error(translate('Something went wrong'))
        }
      } catch (err) {
        logger.error(translate('Something went wrong'))
      }
      this.isScrollable = this.availablePickers.length < total;
      this.isLoading = false;
    }
  },
  async mounted() {
    // getting picker information on initial load
    await this.getPicker();
  },
  async ionViewWillEnter() {
    this.isScrollingEnabled = false;
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      saveOutline,
      store,
      translate
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