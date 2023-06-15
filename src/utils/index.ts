import { toastController } from '@ionic/vue';
import { Plugins } from '@capacitor/core';
import { translate } from '@/i18n'
import { DateTime } from "luxon";

// TODO Use separate files for specific utilities

const showToast = async (message: string) => {
  const toast = await toastController
    .create({
      message,
      duration: 3000,
      position: 'top',
    })
  return toast.present();
}

const copyToClipboard = async (text: any) => {
  const { Clipboard } = Plugins;

  await Clipboard.write({
    string: text,
  }).then(() => {
    showToast(translate("Copied", { text }));
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

export { copyToClipboard, showToast, handleDateTimeInput, getFeature }
