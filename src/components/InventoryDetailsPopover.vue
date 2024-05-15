<template>
  <ion-content>
    <ion-list>
      <ion-list-header>Inventory computation</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">Quantity on hands</ion-label>
        <ion-note slot="end">{{ getProductStock(item.productId)?.quantityOnHandTotal ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">Safety stock</ion-label>
        <ion-note slot="end">{{ minimumStock }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">Order reservation</ion-label>
        <ion-note slot="end">{{ reservedQuantity ?? '0' }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">Online ATP</ion-label>
        <ion-badge slot="end" color="success">{{ onlineAtp }}</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonList,
} from '@ionic/vue'

import { defineComponent } from 'vue';
import { useStore, mapGetters } from 'vuex';
import { prepareOrderQuery } from '@/utils/solrHelper';
import { UtilService } from '@/services/UtilService';
import { hasError } from '@/adapter';
import logger from "@/logger";

  export default defineComponent({  
    name: 'InventoryDetailsPopover',
    component:{
      IonHeader,
      IonToolbar,
      IonButtons,
      IonTitle,
      IonContent,
      IonItem,
      IonLabel,
      IonNote,
      IonBadge,
      IonList,
    },
    props: ['minimumStock', 'onlineAtp', 'item'],
    data () {
      return {
        reservedQuantity: ''
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
      await this.store.dispatch('stock/fetchStock', { productId: this.item.productId })
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
      store
    };


    }
  })
</script>