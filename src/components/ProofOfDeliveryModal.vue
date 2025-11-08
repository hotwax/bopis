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
        <strong>{{ translate("Please enter the details of the person picking up the order.") }}</strong>
      </p>

      <!-- Add checkbox for same as billing -->
      <ion-item class="form-item">
        <ion-checkbox v-model="sameAsBilling" @ion-change="handleSameAsBilling">
          {{ translate("Same as billing details") }}
        </ion-checkbox>
      </ion-item>

      <div class="form-stack">
        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("Name") }}</ion-label>
          <ion-input v-model="form.name" placeholder="Enter name" :disabled="isSubmitting || sameAsBilling" required />
        </ion-item>

        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("ID Number") }}</ion-label>
          <ion-input v-model="form.idNumber" placeholder="Enter ID number" :disabled="isSubmitting || sameAsBilling" required />
        </ion-item>

        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("Relation to Customer") }}</ion-label>
          <ion-select v-model="form.relationToCustomer" placeholder="Select relation" :disabled="isSubmitting" interface="action-sheet" @ionChange="$event.target.closeCircle()" >
            <ion-select-option value="Self">{{ translate("Self") }}</ion-select-option>
            <ion-select-option value="Family Member">{{ translate("Family Member") }}</ion-select-option>
            <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
            <ion-select-option value="Other Relation">{{ translate("Other Relation") }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("Email") }}</ion-label>
          <ion-input v-model="form.email" type="email" placeholder="Enter email" :disabled="isSubmitting" />
        </ion-item>
      </div>
    </div>
  </ion-content>

  <!-- Floating Save Button -->
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button
      data-testid="proof-of-delivery-save-button"
      @click="submitForm"
      :disabled="isSubmitting"
    >
      <ion-spinner v-if="isSubmitting" name="crescent" />
      <ion-icon v-else :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
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
  IonFab,
  IonFabButton,
  modalController,
  IonSelect,
  IonSelectOption,
  IonCheckbox
} from "@ionic/vue";
import { defineComponent, ref, onMounted } from "vue";
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
    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption,
    IonCheckbox
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
      handleSameAsBilling
    };
  }
});
</script>

<style scoped>
ion-content {
  --background: #ffffff;
}

/* Section spacing */
.billing-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.billing-line {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
}

/* Pickup section styling */
.pickup-section {
  margin-top: 1.5rem;
}

.pickup-info {
  font-size: 14px;
  margin-bottom: 1rem;
  color: #222;
}

/* Form layout */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-item {
  --min-height: 48px;
  width: 100%;
}

/* General form input appearance */
ion-label {
  font-size: 14px;
  color: #444;
  font-weight: 500;
}

ion-input {
  font-size: 14px;
}

ion-select {
  width: 100%;
  max-width: 100%;
}

ion-fab-button {
  --background: #3b82f6;
  --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

/* Add styles for checkbox */
ion-checkbox {
  margin: 1rem 0;
}
</style>
