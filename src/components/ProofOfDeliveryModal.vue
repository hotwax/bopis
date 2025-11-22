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
      <ion-item lines="none">
        <ion-checkbox slot="start" v-model="sameAsBilling" @ion-change="handleSameAsBilling" label-placement="end">
          {{ translate("Same person as the billing customer") }}
        </ion-checkbox>
      </ion-item>

      <div class="form-stack">
        <ion-item lines="inset">
          <ion-input v-model="form.name" :disabled="isSubmitting || sameAsBilling" required :label="translate('Name')" label-placement="floating" />
        </ion-item>

        <ion-item>
          <ion-input v-model="form.idNumber" :disabled="isSubmitting || sameAsBilling" required :label="translate('ID Number')" label-placement="floating" />
        </ion-item>

        <ion-item >
          <ion-select justify="space-between" v-model="form.relationToCustomer" placeholder="Select" :disabled="isSubmitting" :label="translate('Relation to customer')" interface="popover">
            <ion-select-option value="Family">{{ translate("Family") }}</ion-select-option>
            <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
            <ion-select-option value="Self">{{ translate("Self") }}</ion-select-option>
          </ion-select>
        </ion-item>


        <ion-item lines="inset">
          <ion-input v-model="form.email" type="email" :disabled="isSubmitting" :label="translate('Email')" label-placement="floating" />
        </ion-item>
      </div>
    </div>
  </ion-content>
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button @click="submitForm" :disabled="isSubmitting || !isFormValid">
      <ion-icon :icon="saveOutline" />
    </ion-fab-button>
  </ion-fab>
</template>

<script setup>
  import { modalController } from "@ionic/vue";
  import { defineComponent, defineOptions, defineProps, onMounted, ref, computed } from "vue";
  import { closeOutline, saveOutline } from "ionicons/icons";
  import { showToast } from "@/utils";
  import { hasError } from "@/adapter";
  import { translate } from "@hotwax/dxp-components";
  import { OrderService } from "@/services/OrderService";
  import logger from '@/logger'

  defineOptions({ name: "ProofOfDeliveryModal" });

  const props = defineProps({
    order: { type: Object, required: true },
    deliverShipmentFn: { type: Function, required: true }
  })

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
    return form.value.name.trim() !== "" && form.value.idNumber.trim() !== "" && form.value.relationToCustomer !== "";
  });

  // Fetch billing details on modal open
  const getBillingDetails = async () => {
    try {
      if (!props.order?.orderId) return;
      const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
      billingDetails.value = resp?.data?.billToAddress || {};

      // Prefill form fields from billing details by default
      form.value.name = billingDetails.value?.toName || billingDetails.value?.contactName || "";
      form.value.email = billingDetails.value?.email || billingDetails.value?.toEmail || "";
      form.value.relationToCustomer = "Self"; // Set default relation
    } catch (err) {
      logger.error("Error fetching billing details:", err);
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
    try {
      await modalController.dismiss({ dismissed: true });
    } catch (e) {
      // ignore if modal already dismissed
      console.warn("Modal already dismissed:", e);
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
        logger.error("Deliver shipment function failed:", err);
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
        logger.error("Pickup notification failed:", resp);
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

/* Form layout */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

</style>