<template>
    <ion-card>
          <ion-list>
            <ion-item @click="viewProduct()" detail="true" lines="none">
              <ion-label>
                <h1>{{ order.customerName }}</h1>
                <p>{{ order.customerId }}</p>
              </ion-label>
              <ion-note>
                <p>{{ order.orderDate }}</p>
              </ion-note>
            </ion-item>
            
            <ProductListItem v-for="item in order.items" :key="item.itemId" :item="item" />

            <ion-item >
              <ion-icon :icon="callOutline" slot="start" />
              <ion-label>phone number</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard('Phone Number Copied')">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
            <ion-item lines="full" v-if="order.email">
              <ion-icon :icon="mailOutline" slot="start" />
              <ion-label>email</ion-label>
              <ion-button fill="outline" slot="end" color="medium" @click="copyToClipboard(order.email)">
                {{ $t("Copy") }}
              </ion-button>
            </ion-item>
          </ion-list>
          <div class="border-top">
            <ion-button fill="clear" @click="readyForPickup">
            {{ $t("Ready For Pickup") }}
            </ion-button>
          </div>
          
        </ion-card>
</template>


<script lang="ts">
import { IonCard , IonList , IonItem , IonLabel , IonNote , IonThumbnail , IonButton , IonIcon , alertController} from "@ionic/vue";
import Image from './Image.vue'
import ProductListItem from './ProductListItem.vue'
import { callOutline, mailOutline } from "ionicons/icons";
import { onMounted, defineComponent } from "vue"
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import {useRouter} from 'vue-router'
import { useStore } from "vuex";


const { Clipboard } = Plugins;

export default defineComponent({
    name: 'OrderItemCard',
    components: {
        IonCard,
        IonList,
        IonItem,
        IonLabel,
        IonNote,
        IonButton,
        IonIcon,
        ProductListItem
    },
    props: ["order"],
    methods: {
      async copyToClipboard(text: string) {
        await Clipboard.write({
          string: text
        }).then(() => {
          // showToast(this.$t('Copied', { text }));
          showToast('Copied')
        })
      },
      async readyForPickup() {
        const alert = await alertController
          .create({
            cssClass: 'my-custom-class',
            header: 'Ready For Pickup',
            message: 'An email notification will be sent to <customer name> that their order is ready for pickup.<br/> <br/> This order will also be moved to the packed orders tab.',
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'secondary',
                handler: blah => {
                  console.log('Confirm Cancel:', blah)
                },
              },
              {
                text: 'Ready For Pickup',
                handler: () => {
                  console.log('Confirm Okay')
                },
              },
            ],
          });
        return alert.present();
      },
      async viewProduct () {
      await this.store.dispatch('orders/updateCurrentOrder', {product: this.order});
        
        this.router.push({ path: `/orderdetail/${this.order.orderId}` })
        console.log("order",this.order)
      }
    },
    setup() {
      const router = useRouter();
      const store = useStore();
        return {
            callOutline,
            mailOutline,
            router,
            store,
        }
    }
})
</script>

<style>
.border-top{
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>