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

      <div class="form-grid">
        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("Name") }}</ion-label>
          <ion-input v-model="form.name" placeholder="Enter name" required />
        </ion-item>

        <ion-item class="form-item">
          <ion-label position="stacked">{{ translate("ID Number") }}</ion-label>
          <ion-input v-model="form.idNumber" placeholder="Enter ID number" required />
        </ion-item>
      </div>

      <ion-item class="form-item">
        <ion-label position="stacked">{{ translate("Relation to Customer") }}</ion-label>
        <ion-input v-model="form.relationToCustomer" placeholder="Enter relation" />
      </ion-item>

      <ion-item class="form-item">
        <ion-label position="stacked">{{ translate("Email") }}</ion-label>
        <ion-input v-model="form.email" type="email" placeholder="Enter email" />
      </ion-item>
    </div>
  </ion-content>

  <!-- Floating Save Button -->
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="proof-of-delivery-save-button" @click="submitForm">
      <ion-icon :icon="saveOutline" />
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
  modalController
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
    IonFabButton
  },
  props: ["order"],
  setup(props) {
    const store = useStore();
    const form = ref({
      name: "",
      idNumber: "",
      relationToCustomer: "",
      email: ""
    });

    const billingDetails = ref({});

    // Fetch billing details on modal open
    const getBillingDetails = async () => {
      try {
        const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
        billingDetails.value = resp?.data?.billToAddress || {};
      } catch (err) {
        console.error("Error fetching billing details:", err);
      }
    };

    const closeModal = () => {
      modalController.dismiss({ dismissed: true });
    };

    const deliverShipment = async (order) => {
      try {
        const resp = await store.dispatch("order/deliverShipment", order);
        if (!hasError(resp)) {
          showToast(translate("Order delivered successfully"));
        }
      } catch (err) {
        console.error("Error in deliverShipment:", err);
      }
    };

    const submitForm = async () => {
      const deliveryResp = await deliverShipment(props.order);
      if (hasError(deliveryResp)) return;

      // Construct payload based on your backend service definition
       try {
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
          emailType: "HANDOVER_BOPIS_ORDER",
          additionalFields: {
            name: form.value.name,
            idNumber: form.value.idNumber,
            relationToCustomer: form.value.relationToCustomer,
            email: form.value.email
          },
          emailAddress: form.value.email
        };

        
        // Call your new API
        const resp = await OrderService.sendPickupNotification(payload);

        if (hasError(resp)) {
          console.error("Pickup notification failed:", resp);
          showToast(translate("Failed to send handover email"));
        } else {
          showToast(translate("Handover email sent successfully"));
        }

        await closeModal();
      } catch (err) {
        console.error("Error in submitForm:", err);
        showToast(translate("Something went wrong"));
      }
    };

    onMounted(() => {
      getBillingDetails();
    });

    return {
      closeOutline,
      saveOutline,
      translate,
      form,
      closeModal,
      submitForm,
      billingDetails
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
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.form-item {
  --min-height: 48px;
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

ion-fab-button {
  --background: #3b82f6;
  --box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}
</style>
