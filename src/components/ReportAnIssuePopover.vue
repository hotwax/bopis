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

<script lang="ts">
import {
  IonContent,
  IonItem,
  IonList,
  popoverController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import { mapGetters } from 'vuex';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "ReportIssuePopover",
  components: { 
    IonContent,
    IonItem,
    IonList
  },
  props: {
    reasonType: {
      type: String,
      default: "reject"
    }
  },
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
      cancelReasons: 'util/getCancelReasons',
    })
  },
  methods: {
    closePopover() {
      popoverController.dismiss();
    },
    updateIssue(enumId: string) {
      popoverController.dismiss(enumId);
    },
  },
  setup() {
    return {
      translate
    }
  }
});
</script>