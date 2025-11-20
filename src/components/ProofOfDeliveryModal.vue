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

  <ion-content ref="contentRef" :scroll-events="true" class="ion-padding">
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
          <div slot="start">
            <ion-label>{{ translate("Relation to customer") }}</ion-label>
          </div>
          <div slot="end">
            <ion-select v-model="form.relationToCustomer" placeholder="Select" :disabled="isSubmitting" interface="popover">
              <ion-select-option value="Family">{{ translate("Family") }}</ion-select-option>
              <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
            </ion-select>
          </div>

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
        <span v-else>{{ translate("HANDOVER") }}</span>
      </ion-button>
    </ion-toolbar>
  </ion-footer>
</template>


<script>
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
  modalController,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  IonSpinner
} from "@ionic/vue";
import { defineComponent, ref, onMounted, computed } from "vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { useStore } from "vuex";
import { showToast } from "@/utils";
import { hasError } from "@/adapter";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";


export default defineComponent({
  name: "ProofOfDeliveryModal",
  components: {
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
  },
  props: {
    order: { type: Object, required: true },
    deliverShipmentFn: { type: Function, required: true }
  },
  setup(props) {
    const store = useStore();
    const isSubmitting = ref(false);
    const sameAsBilling = ref(false);
    
    const form = ref({
      name: "",
      idNumber: "",
      relationToCustomer: "Self",
      email: ""
    });

    const billingDetails = ref({});

    // Computed property for form validation
    const isFormValid = computed(() => {
      return form.value.name.trim() !== "" && 
             form.value.idNumber.trim() !== "" && 
             form.value.relationToCustomer !== "";
    });

    // Fetch billing details on modal open
    const getBillingDetails = async () => {
      try {
        const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
        billingDetails.value = resp?.data?.billToAddress || {};

        // Prefill form fields from billing details by default
        form.value.name = billingDetails.value?.toName || billingDetails.value?.contactName || "";
        form.value.email = billingDetails.value?.email || billingDetails.value?.toEmail || "";
        form.value.relationToCustomer = "Self"; // Set default relation
      } catch (err) {
        console.error("Error fetching billing details:", err);
      }
    };

    // Handle Same as Billing checkbox
    const handleSameAsBilling = () => {
      if (sameAsBilling.value) {
        // When checked, restore billing details and prefilled ID
        form.value.name = billingDetails.value?.toName || billingDetails.value?.contactName || "";
        form.value.email = billingDetails.value?.email || billingDetails.value?.toEmail || "";
        form.value.relationToCustomer = "Self";
      } else {
        // When unchecked, clear only name and email
        form.value.name = "";
        form.value.email = "";
      }
    };

    // Fetch order attributes to get prefield id for customerId and prefill idNumber
    const getPrefilledValue = async () => {
      try {
        if (!props.order?.orderId) return;
        const resp = await OrderService.fetchOrderAttributes(props.order.orderId);
        const data = resp?.data ?? resp;
        const list = Array.isArray(data) ? data : (data?.docs || data?.attributes || []);
        const customerAttr = list.find((a) => a?.attrName === "customerId");
        const prefilledId = customerAttr?.attrValue || "";
        if (prefilledId) {
          form.value.idNumber = prefilledId;
        }
      } catch (err) {
        console.error("Failed fetching order attributes:", err);
      }
    };

    const closeModal = async () => {
      try {
        await modalController.dismiss({ dismissed: true });
      } catch (e) {
        // ignore if modal already dismissed
      }
    };

    const submitForm = async () => {
      if (isSubmitting.value) return;
      isSubmitting.value = true;

      try {
        // Call deliverShipmentFn (may open confirmation)
        let deliveryResp;
        try {
          deliveryResp = await props.deliverShipmentFn(props.order);
        } catch (err) {
          console.error("Deliver shipment function failed:", err);
          showToast(translate("Delivery failed"));
          return;
        }

        // Build orderItems array from order.items
        const orderItemsList = (props.order?.items || []).map(item => ({
          orderId: item.orderId,
          orderItemSeqId: item.orderItemSeqId,
          shipGroupSeqId: item.shipGroupSeqId
        }));

        // Construct the payload as per backend definition
        const payload = {
          orderId: props.order?.orderId,
          orderItems: orderItemsList,
          shipmentId: props.order?.shipmentId,
          emailType: "HANDOVER_POD_BOPIS",
          additionalFields: {
            name: form.value.name,
            idNumber: form.value.idNumber,
            relationToCustomer: form.value.relationToCustomer,
            email: form.value.email
          }
        };

        const resp = await OrderService.sendPickupNotification(payload);

        if (hasError(resp)) {
          console.error("Pickup notification failed:", resp);
          showToast(translate("Failed to send handover email"));
        } else {
          showToast(translate("Handover email sent successfully"));
        }

        // Close modal after processing
        await closeModal();
      } catch (err) {
        console.error("Error in submitForm:", err);
        showToast(translate("Something went wrong"));
      } finally {
        isSubmitting.value = false;
      }
    };

    onMounted(async () => {
      await getBillingDetails();
      await getPrefilledValue();
    });

    return {
      closeOutline,
      saveOutline,
      translate,
      form,
      closeModal,
      submitForm,
      billingDetails,
      isSubmitting,
      sameAsBilling,
      handleSameAsBilling,
      isFormValid
    };
  }
});
</script>

<style scoped>
ion-content {
  --background: #fafafa;
}

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