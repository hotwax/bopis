<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ translate("Inventory computation")}}</ion-list-header>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Quantity on hand")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).quantityOnHand ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Safety stock")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).minimumStock ?? '0' }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-wrap">{{ translate("Order reservations")}}</ion-label>
        <ion-note slot="end">{{ getInventoryInformation(item.productId).reservedQuantity ?? '0' }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">{{ translate("Online ATP")}}</ion-label>
        <ion-badge slot="end" color="success">{{ getInventoryInformation(item.productId).onlineAtp ?? '0' }}</ion-badge>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonBadge,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote
} from '@ionic/vue'

import { defineComponent } from 'vue';
import { useStore, mapGetters } from 'vuex';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({  
  name: 'InventoryDetailsPopover',
  components:{
    IonBadge,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
  },
  props: ['item'],
  computed: {
    ...mapGetters({
      product: "product/getCurrent",
      // getProductStock: 'stock/getProductStock',
      getInventoryInformation: 'stock/getInventoryInformation',
    })   
  },
  async beforeMount () {
    const productId = this.item?.productId;
    await this.store.dispatch('stock/fetchProductInventory', { productId });
    // this.fetchReservedQuantity( this.item.productId );
  },
  methods: {
    // async fetchReservedQuantity(productId: any){
    //   await this.store.dispatch('stock/fetchReservedQuantity', { productId });
    // },
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