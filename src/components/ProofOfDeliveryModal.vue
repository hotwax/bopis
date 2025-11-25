<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Proof of Delivery") }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <!-- Billing Details -->
    <div class="billing-section">
      <h2 class="section-title">{{ translate("Billing Details") }}</h2>
      <p>{{ billingDetails?.toName }}</p>
      <p>{{ billingDetails?.address1 }}</p>
      <p>{{ billingDetails?.city }} {{ billingDetails?.state }} {{ billingDetails?.country }}</p>
    </div>

    <!-- Pickup Section -->
    <div>
      <ion-item lines="none">
        <ion-label><strong>{{ translate("Please enter the details of the person picking up the order.") }}</strong></ion-label>
      </ion-item>

      <!-- Add checkbox for same as billing -->
      <ion-item lines="none">
        <ion-checkbox slot="start" v-model="sameAsBilling" @ion-change="handleSameAsBilling" label-placement="end">
          {{ translate("Same person as the billing customer") }}
        </ion-checkbox>
      </ion-item>

      <ion-input v-model="form.name" :label="translate('Name')" label-placement="floating" :disabled="isSubmitting || sameAsBilling" required/>

      <ion-input v-model="form.idNumber" :label="translate('ID Number')" label-placement="floating" :disabled="isSubmitting || sameAsBilling" required/>

      <ion-select v-model="form.relationToCustomer" :label="translate('Relation to customer')" label-placement="start" placeholder="Select" :disabled="isSubmitting" interface="popover">
        <ion-select-option value="Self">{{ translate("Self") }}</ion-select-option>
        <ion-select-option value="Family">{{ translate("Family") }}</ion-select-option>
        <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
      </ion-select>

      <ion-input v-model="form.email" :label="translate('Email')" label-placement="floating" type="email" :disabled="isSubmitting" />
    </div>
  </ion-content>

  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="handover-modal-button" :disabled="isSubmitting || !isFormValid" @click="submitForm">
      <ion-icon :icon="saveOutline"/>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup>
import { ref, onMounted, computed, defineProps } from "vue";
import { modalController } from "@ionic/vue";
import { saveOutline } from "ionicons/icons";
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonTitle,
  IonItem,
  IonInput,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonCheckbox
} from "@ionic/vue";
import { closeOutline } from "ionicons/icons";
import logger from "@/logger";
import { showToast } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";

const props = defineProps({
  order: { type: Object, required: true }
});

const isSubmitting = ref(false);
const sameAsBilling = ref(true);
const billingDetails = ref({});

const form = ref({
  name: "",
  idNumber: "",
  relationToCustomer: "Self",
  email: ""
});

const isFormValid = computed(() => {
  return form.value.name.trim() !== "" &&
    form.value.idNumber.trim() !== "" &&
    form.value.relationToCustomer !== "";
});

const getBillingDetails = async () => {
  if (!props.order?.orderId) return;
  
  try {
    const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
    billingDetails.value = resp?.data?.billToAddress || {};

    form.value.name = billingDetails.value.toName || "";
    form.value.email = billingDetails.value.email || "";
    form.value.relationToCustomer = "Self";
  } catch (err) {
    logger.error("Error fetching billing details:", err);
  }
};

const getPrefilledValue = async () => {
  if (!props.order?.orderId) return;
  
  try {
    const resp = await OrderService.fetchOrderAttributes(props.order.orderId);
    const data = resp.data || {};
    const customerAttr = data.find((a) => a.attrName === "customerId");
    
    if (customerAttr?.attrValue) {
      form.value.idNumber = customerAttr.attrValue;
    }
  } catch (err) {
    logger.error("Failed fetching order attributes:", err);
  }
};

const handleSameAsBilling = () => {
  if (sameAsBilling.value) {
    form.value.name = billingDetails.value.toName || "";
    form.value.email = billingDetails.value.email || "";
    form.value.relationToCustomer = "Self";
  } else {
    form.value.name = "";
    form.value.email = "";
  }
};

const closeModal = async () => {
  await modalController.dismiss({ dismissed: true });
};

const submitForm = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const orderItemsList = (props.order?.items || props.order?.shipGroup?.items || []).map(item => ({
      orderId: item.orderId,
      orderItemSeqId: item.orderItemSeqId,
      shipGroupSeqId: item.shipGroupSeqId
    }));

    const proofOfDeliveryData = {
      orderId: props.order?.orderId,
      orderItems: orderItemsList,
      shipmentId: props.order?.shipmentId || props.order?.shipGroup?.shipmentId,
      emailType: "HANDOVER_POD_BOPIS",
      additionalFields: {
        name: form.value.name,
        idNumber: form.value.idNumber,
        relationToCustomer: form.value.relationToCustomer,
        email: form.value.email
      }
    };

    await modalController.dismiss({ 
      proofOfDeliveryData,
      confirmed: true 
    });
  } catch (err) {
    logger.error("Error in submitForm:", err);
    showToast(translate("Something went wrong"));
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  await getBillingDetails();
  await getPrefilledValue();
});
</script>