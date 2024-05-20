<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Inventory computation")}}</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Quantity on hands")}}</ion-label>
        <ion-note slot="end">{{ getProductStock(item.productId)?.quantityOnHandTotal ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
        <ion-note slot="end">{{ minimumStock }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
        <ion-note slot="end">{{ reservedQuantity ?? 0 }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">{{ translate("Online ATP")}}</ion-label>
        <ion-badge slot="end" color="success">{{ onlineAtp }}</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar
} from '@ionic/vue'

import { defineComponent } from 'vue';
import { useStore, mapGetters } from 'vuex';
import { translate } from '@hotwax/dxp-components';
import { prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';
import { hasError } from '@/adapter';
import logger from "@/logger";

export default defineComponent({  
  name: 'InventoryDetailsPopover',
  component:{
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
  },
  props: ['minimumStock', 'onlineAtp', 'item'],
  data () {
    return {
      reservedQuantity: 0
    }
  },
  computed: {
    ...mapGetters({
      product: "product/getCurrent",
      getProductStock: 'stock/getProductStock',
      currentFacility: 'user/getCurrentFacility',
    })   
  },
  async beforeMount () {
    const productId = this.item?.productId;
    await this.store.dispatch('stock/fetchStock', { productId })
    this.fetchReservedQuantity( this.item.productId );
  },
  methods: {
    async fetchReservedQuantity(productId: any){
      const payload = prepareOrderQuery({
        viewSize: "0",  // passing viewSize as 0, as we don't want to fetch any data
        defType: "edismax",
        filters: {
          facilityId: this.currentFacility.facilityId,
          productId: productId
        },
        facet: {
          "reservedQuantityFacet": "sum(itemQuantity)"
        }
      })
      try {
        const resp = await UtilService.fetchReservedQuantity(payload)
        if(resp.status == 200 && !hasError(resp)) {
          this.reservedQuantity = resp.data.facets.reservedQuantityFacet
        } else {
          throw resp.data
        }
      } catch(err) {
        logger.error('Failed to fetch reserved quantity', err)
      }
    },
  },

  setup () {
    const store = useStore();
    return {
      store,
      translate
    }
  }
})
</script>