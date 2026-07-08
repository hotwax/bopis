<template>
  <ion-content>
    <ion-list v-if="reasonType === 'reject'">
      <ion-item data-testid="select-rejection-reason-button" v-for="reason in rejectReasons" :key="reason.enumId" @click="updateIssue(reason.enumId)" button>
        {{ reason.enumDescription ? translate(reason.enumDescription) : reason.description ? translate(reason.description) : reason.enumId  }}
      </ion-item>
    </ion-list>
    <ion-list v-else>
      <ion-item data-testid="select-cancellation-reason-button" v-for="reason in cancelReasons" :key="reason.enumId" @click="updateIssue(reason.enumId)" button>
        {{ reason.enumDescription ? translate(reason.enumDescription) : reason.enumId  }}
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script setup lang="ts">
import { IonContent, IonItem, IonList, popoverController } from "@ionic/vue";
import { computed } from "vue";
import { translate } from '@common';
import { useOrderStore } from "@/store/order";

defineProps({
  reasonType: {
    type: String,
    default: "reject"
  }
})

const rejectReasons = computed(() => useOrderStore().getRejectReasons);
const cancelReasons = computed(() => useOrderStore().getCancelReasons);

function updateIssue(enumId: string) {
  popoverController.dismiss(enumId);
}
</script>
