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
      <p class="billing-line">{{ billingDetails?.toName }}</p>
      <p class="billing-line">{{ billingDetails?.address1 }}</p>
      <p class="billing-line">
        {{ billingDetails?.city }} {{ billingDetails?.state }} {{ billingDetails?.country }}
      </p>
    </div>

    <!-- Pickup Section -->
    <div class="pickup-section">
      <p class="pickup-info">
        {{ translate("Please enter the details of the person picking up the order:") }}
      </p>

      <!-- Add checkbox for same as billing -->
      <ion-item lines="none" class="checkbox-item">
        <ion-checkbox slot="start" v-model="sameAsBilling" @ion-change="handleSameAsBilling" />
        <ion-label>{{ translate("Same person as the billing customer") }}</ion-label>
      </ion-item>

      <div class="form-stack">
        <ion-item class="form-item" lines="inset">
          <ion-label position="floating">{{ translate("Name") }}</ion-label>
          <ion-input v-model="form.name" :disabled="isSubmitting || sameAsBilling" required />
        </ion-item>

        <ion-item class="form-item">
          <ion-label position="floating">{{ translate("ID Number") }}</ion-label>
          <ion-input v-model="form.idNumber" :disabled="isSubmitting || sameAsBilling" required />
        </ion-item>

         <ion-item class="form-item" lines="full">
          <ion-select v-model="form.relationToCustomer" :label="translate('Relation to customer')" labelPlacement="floating" placeholder="Select" :disabled="isSubmitting" interface="popover">
            <ion-select-option value="Self">{{ translate("Self") }}</ion-select-option>
            <ion-select-option value="Family">{{ translate("Family") }}</ion-select-option>
            <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item class="form-item" lines="inset">
          <ion-label position="floating">{{ translate("Email") }}</ion-label>
          <ion-input v-model="form.email" type="email" :disabled="isSubmitting" />
        </ion-item>
      </div>
    </div>
  </ion-content>

  <!-- Fixed Save Button at Bottom -->
  <ion-footer>
    <ion-toolbar>
      <ion-button expand="block" @click="submitForm" :disabled="isSubmitting || !isFormValid" class="save-button">
        <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
        <span>{{ translate("HANDOVER") }}</span>
      </ion-button>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup>
import { ref, onMounted, computed, defineProps } from "vue";
import { modalController } from "@ionic/vue";
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonFooter,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonSpinner
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
const sameAsBilling = ref(false);

const form = ref({
  name: "",
  idNumber: "",
  relationToCustomer: "Self",
  email: ""
});

const billingDetails = ref({});

const isFormValid = computed(() => {
  return form.value.name.trim() !== "" &&
    form.value.idNumber.trim() !== "" &&
    form.value.relationToCustomer !== "";
});

const getBillingDetails = async () => {
  try {
     if (!props.order?.orderId) return;
    const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
    billingDetails.value = resp?.data?.billToAddress || {};

    form.value.name = billingDetails.value?.toName || billingDetails.value?.contactName || "";
    form.value.email = billingDetails.value?.email || billingDetails.value?.toEmail || "";
    form.value.relationToCustomer = "Self";
  } catch (err) {
    logger.error("Error fetching billing details:", err);
  }
};

const handleSameAsBilling = () => {
  if (sameAsBilling.value) {
    form.value.name = billingDetails.value?.toName || billingDetails.value?.contactName || "";
    form.value.email = billingDetails.value?.email || billingDetails.value?.toEmail || "";
    form.value.relationToCustomer = "Self";
  } else {
    form.value.name = "";
    form.value.email = "";
  }
};

const getPrefilledValue = async () => {
  try {
    if (!props.order?.orderId) return;
    const resp = await OrderService.fetchOrderAttributes(props.order.orderId);
    const data = resp?.data ?? resp;
    const list = Array.isArray(data) ? data : (data?.docs || data?.attributes || []);
    const customerAttr = list.find((a) => a.attrName === "customerId");
    const prefilledId = customerAttr?.attrValue || "";
    if (prefilledId) {
      form.value.idNumber = prefilledId;
    }
  } catch (err) {
    logger.error("Failed fetching order attributes:", err);
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

    // Return the proof of delivery data to parent component
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

<style scoped>
/* Section spacing */
.billing-section {
  margin-bottom: 2rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
}

.section-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.billing-line {
  margin: 0;
  font-size: 14px;
  line-height: 22px;
  color: #333;
}

/* Pickup section styling */
.pickup-section {
  margin-top: 1rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
}

.pickup-info {
  font-size: 14px;
  margin-bottom: 1rem;
  color: #333;
  font-weight: 400;
}

/* Checkbox styling */
.checkbox-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  margin-bottom: 1.5rem;
}

.checkbox-item ion-label {
  margin-left: 0.75rem;
  font-size: 14px;
  color: #333;
}

/* Form layout */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 56px;
  --background: transparent;
}

/* General form input appearance */
ion-label {
  font-size: 12px;
  color: #666;
  font-weight: 400;
  margin-bottom: 4px;
}

ion-input {
  font-size: 14px;
  color: #333;
}

ion-select {
  font-size: 14px;
  color: #333;
  width: 100%;
  max-width: 100%;
}

/* Footer and button styling */
ion-footer {
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

ion-footer ion-toolbar {
  --padding-top: 12px;
  --padding-bottom: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.save-button {
  --background: #2563eb;
  --background-hover: #1d4ed8;
  --background-activated: #1e40af;
  --border-radius: 8px;
  --box-shadow: none;
  height: 48px;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin: 0;
}

.save-button[disabled] {
  --background: #e5e7eb;
  --color: #9ca3af;
}
</style>