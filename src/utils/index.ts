import { toastController } from '@ionic/vue';
import { Plugins } from '@capacitor/core';
import { translate } from '@/i18n'

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_;
}

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

const getFeature = (features: any, key: string) => {
  let featureValue = ''
  if (features) {
    featureValue = features.find((feature: any) => feature.desc === key)?.value
  }
  // returning 0th index as the featureValue is an array
  return featureValue ? featureValue[0] : '';
}

export { copyToClipboard, showToast, hasError, getFeature }
