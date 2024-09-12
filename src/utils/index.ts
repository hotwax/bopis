import { toastController } from '@ionic/vue';
import { Plugins } from '@capacitor/core';
import { translate } from '@hotwax/dxp-components'
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

const showToast = async (message: string, options?: any) => {
  const config = {
    message,
    ...options
  } as any;

  if (!options?.position) {
    config.position = 'top';
  }
  if (options?.canDismiss) {
    config.buttons = [
      {
        text: translate('Dismiss'),
        role: 'cancel',
      },
    ]
  }
  if (!options?.manualDismiss) {
    config.duration = 3000;
  }

  const toast = await toastController.create(config)
  // present toast if manual dismiss is not needed
  return !options?.manualDismiss ? toast.present() : toast
}

const copyToClipboard = async (text: any, showCopiedValue = true) => {
  const { Clipboard } = Plugins;

  await Clipboard.write({
    string: text,
  }).then(() => {
    if(showCopiedValue) {
      showToast(translate("Copied", { text }));
    } else {
      showToast(translate("Copied to clipboard"));
    }
  });
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const getFeature = (featureHierarchy: any, featureKey: string) => {
  let  featureValue = ''
  if (featureHierarchy) {
    const feature = featureHierarchy.find((featureItem: any) => featureItem.startsWith(featureKey))
    const featureSplit = feature ? feature.split('/') : [];
    featureValue = featureSplit[2] ? featureSplit[2] : '';
  }
  return featureValue;
}

const formatPhoneNumber = (countryCode: string | null, areaCode: string | null, contactNumber: string | null)  => {
  if (countryCode && areaCode) {
    return `+${countryCode}-${areaCode}-${contactNumber}`;
  } else if (countryCode) {
    return `+${countryCode}-${contactNumber}`;
  } else {
    return contactNumber;
  }
}

export { copyToClipboard, showToast, handleDateTimeInput, getFeature, formatPhoneNumber }
