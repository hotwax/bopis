<template>
  <ion-content>
    <ion-list>
      <ion-item v-for="reason in rejectReasons" :key="reason.enumId" @click="updateIssue(reason.enumId)" button>
        {{ reason.description ? translate(reason.description) : reason.enumDescription ? translate(reason.enumDescription) : reason.enumId  }}
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
  computed: {
    ...mapGetters({
      rejectReasons: 'util/getRejectReasons',
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