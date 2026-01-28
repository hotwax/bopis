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
    <ion-item lines="none" v-if="Object.keys(billingDetails?.billingAddress).length">
      <ion-label>
        <strong>{{ translate("Billing Details") }}</strong>
        <p class="ion-padding-top">{{ billingDetails?.billingAddress?.toName }}</p>
        <p>{{ billingDetails?.billingAddress?.address1 }}</p>
        <p>{{ billingDetails?.billingAddress?.city }} {{ billingDetails?.billingAddress?.state }} {{ billingDetails?.billingAddress?.country }}</p>
      </ion-label>
    </ion-item>

    <!-- Pickup Section -->
    <ion-item lines="none">
      <ion-label><strong>{{ !isViewModeOnly ? translate("Please enter the details of the person picking up the order.") : translate("Details of The Person:") }}</strong></ion-label>
    </ion-item>

    <template v-if="!isViewModeOnly">
      <!-- Add checkbox for same as billing -->
      <ion-item lines="none" v-if="Object.keys(billingDetails?.billingAddress).length">
        <ion-checkbox justify="start" v-model="sameAsBilling" @ion-change="handleSameAsBilling" label-placement="end">
          {{ translate("Same person as the billing customer") }}
        </ion-checkbox>
      </ion-item>

      <ion-item>
        <ion-input v-model="form.name" :label="translate('Name')" label-placement="floating" :disabled="isSubmitting || (sameAsBilling && isNamePrefilled)" required/>
      </ion-item>
      <ion-item>
        <ion-input v-model="form.idNumber" :label="translate('ID Number')" label-placement="floating" :disabled="isSubmitting || (sameAsBilling && isIdPrefilled)" required/>
      </ion-item>

      <ion-item>
        <ion-select v-model="form.relationToCustomer" :label="translate('Relation to customer')" label-placement="start" :disabled="isSubmitting" interface="popover">
          <ion-select-option value="Self">{{ translate("Self") }}</ion-select-option>
          <ion-select-option value="Family">{{ translate("Family") }}</ion-select-option>
          <ion-select-option value="Friend">{{ translate("Friend") }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input v-model="form.phone" :label="translate('Phone')" label-placement="floating" type="tel" :disabled="isSubmitting || (sameAsBilling &&isPhonePrefilled)" :error-text="errors.phone" :class="{ 'ion-invalid': errors.phone, 'ion-touched': errors.phone }" />
      </ion-item>
      <ion-item>
        <ion-input v-model="form.email" :label="translate('Email')" label-placement="floating" type="email" :disabled="isSubmitting || (sameAsBilling && isEmailPrefilled)" :error-text="errors.email" :class="{ 'ion-invalid': errors.email, 'ion-touched': errors.email }" />
      </ion-item>
    </template>
    <template v-if="isViewModeOnly">
      <ion-item>
        <ion-label class="ion-text-left">{{ translate("Name") }}</ion-label>
        <ion-label class="ion-text-right">{{ form.name ? form.name : "-" }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-left">{{ translate("ID Number") }}</ion-label>
        <ion-label class="ion-text-right">{{ form.idNumber ? form.idNumber : "-" }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-left">{{ translate("Relation to customer") }}</ion-label>
        <ion-label class="ion-text-right">{{ form.relationToCustomer }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-left">{{ translate("Phone") }}</ion-label>
        <ion-label class="ion-text-right">{{ form.phone ? form.phone : "-" }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-label class="ion-text-left">{{ translate("Email") }}</ion-label>
        <ion-label class="ion-text-right">{{ form.email ? form.email : "-" }}</ion-label>
      </ion-item>
    </template>
  </ion-content>
  <ion-fab v-if="!isViewModeOnly" vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button data-testid="handover-modal-button" :disabled="isSubmitting" @click="submitForm">
      <ion-icon :icon="saveOutline"/>
    </ion-fab-button>
  </ion-fab>
</template>

<script setup>
import { ref, onMounted, computed, defineProps, watch } from "vue";
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
  IonLabel,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
  modalController
} from "@ionic/vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import logger from "@/logger";
import { showToast } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { OrderService } from "@/services/OrderService";
import { useStore } from "@/store";
import { z } from "zod";

const props = defineProps({
  order: { type: Object, required: true },
  isViewModeOnly: { type: Boolean, default: false }
});

const isSubmitting = ref(false);
const sameAsBilling = ref(true);
const billingDetails = ref({});
const isNamePrefilled = ref(false);
const isPhonePrefilled = ref(false);
const isEmailPrefilled = ref(false);
const isIdPrefilled = ref(false);
const idNumberValue = ref("");
const store = useStore();

const communicationEvent = computed(() => store.getters["order/getCommunicationEventsByOrderId"](props.order?.orderId));

const orderContent = computed(() => {
  const event = communicationEvent.value;
  let content = {};
  if (event) {
    try {
      content = JSON.parse(event?.content)?.messageData?.additionalFields;
    } catch (e) {
      logger.error("Error parsing communication event content:", e);
    }
  }
  return content;
});

const form = ref({
  name: "",
  idNumber: "",
  relationToCustomer: "Self",
  email: "",
  phone: ""
});

const errors = ref({});

const formSchema = z.object({
  name: z.string().trim().min(1, translate("Name is required")),
  idNumber: z.string().trim().min(1, translate("ID Number is required")),
  relationToCustomer: z.string().min(1, translate("Relation is required")),
  email: z.email(translate("Please enter a valid email")).or(z.literal("")),
  phone: z.string().regex(/^\+?\d{10,15}$/, translate("Please enter a valid phone")).optional().or(z.literal(""))
});

watch(form, () => {
  const result = formSchema.safeParse(form.value);
  errors.value = {};
  if (!result.success) {
    result.error.issues.forEach(issue => {
      errors.value[issue.path[0]] = issue.message;
    });
  }
}, { deep: true });

const getBillingDetails = async () => {
  if (!props.order?.orderId) return;
  
  try {
    const resp = await OrderService.getBillingDetails({ orderId: props.order.orderId });
    billingDetails.value = resp?.data?.billingDetails || {};

    console.log('resp', billingDetails.value);

    form.value.name = orderContent.value?.name || billingDetails.value?.billingAddress?.toName || "";
    form.value.email = orderContent.value?.email || billingDetails.value.billingEmail || "";
    form.value.phone = orderContent.value?.phone || (billingDetails.value?.billingPhone?.countryCode + billingDetails.value?.billingPhone?.contactNumber) || "";
    form.value.relationToCustomer = orderContent.value?.relationToCustomer || "Self";
    form.value.idNumber = props.isViewModeOnly ? (orderContent.value?.idNumber || "") : (form.value.idNumber || orderContent.value?.idNumber || "");
    isNamePrefilled.value = !!(orderContent.value?.name || billingDetails.value?.billingAddress?.toName);
    isPhonePrefilled.value = !!(orderContent.value?.phone || billingDetails.value?.billingPhone?.countryCode + billingDetails.value?.billingPhone?.contactNumber);
    isEmailPrefilled.value = !!(orderContent.value?.email || billingDetails.value.billingEmail);
  } catch (err) {
    logger.error("Error fetching billing details:", err);
  }
};

const getPrefilledValue = async () => {
  if (!props.order?.orderId) return;
  
  try {
    const resp = await OrderService.fetchOrderAttributes(props.order.orderId);
    const data = resp.data;
    const customerAttr = data.find((a) => a.attrName === "customerId");
    
    if (customerAttr?.attrValue) {
      form.value.idNumber = customerAttr.attrValue;
      idNumberValue.value = customerAttr.attrValue;
      isIdPrefilled.value = true;
    }
  } catch (err) {
    logger.error("Failed fetching order attributes:", err);
  }
};

const handleSameAsBilling = () => {
  if (sameAsBilling.value) {
    form.value.name = billingDetails.value?.billingAddress?.toName || "";
    form.value.email = billingDetails.value?.billingEmail || "";
    form.value.phone = (billingDetails.value?.billingPhone?.countryCode + billingDetails.value?.billingPhone?.contactNumber) || "";
    form.value.idNumber = idNumberValue.value || "";
    form.value.relationToCustomer = "Self";
    isNamePrefilled.value = !!(billingDetails.value?.billingAddress?.toName);
    isPhonePrefilled.value = !!(billingDetails.value?.billingPhone?.countryCode + billingDetails.value?.billingPhone?.contactNumber);
    isEmailPrefilled.value = !!(billingDetails.value?.billingEmail);
  } else {
    form.value.name = "";
    form.value.email = "";
    form.value.phone = "";
    form.value.idNumber = "";
    isNamePrefilled.value = false;
    isPhonePrefilled.value = false;
    isEmailPrefilled.value = false;
  }
};

const closeModal = async () => {
  await modalController.dismiss({ dismissed: true });
};

const submitForm = async () => {
  if (isSubmitting.value) return;

  const result = formSchema.safeParse(form.value);
  if (!result.success) {
    errors.value = {};
    result.error.issues.forEach(issue => {
      errors.value[issue.path[0]] = issue.message;
    });
    showToast(translate("Please correct the errors in the form"));
    return;
  }

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
        email: form.value.email,
        phone: form.value.phone,
        reasonEnumId: "HANDOVER_PROOF"
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
  await getPrefilledValue();
  await getBillingDetails();
});
</script>