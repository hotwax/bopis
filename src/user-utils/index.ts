import { translate } from '@/i18n'
import store from '@/store'
import { alertController } from '@ionic/core'
import { loadingController } from '@ionic/vue'

const login = async (payload: any) => store.dispatch('user/login', payload)

const confirmSessionEnd = (appOms: string) => {
  return new Promise((resolve: any) => {
    alertController
      .create({
        header: translate('Active session'),
        message: translate(`A user is already logged in via. Do you want to end the current session and login with the entered details?`, { appOms }),
        buttons: [{
          text: translate("Cancel"),
          handler: () => resolve(false)
        }, {
          text: translate('Login'),
          handler: () => resolve(true)
        }],
      }).then((alert: any) => {
        alert.present()
      });
  })
}

const logout = async () => store.dispatch('user/logout')

const loader = {
  value: null as any,
  present: async (message: string) => {
    if (!loader.value) {
      loader.value = await loadingController
        .create({
          message: translate(message),
          translucent: false,
          backdropDismiss: false
        });
    }
    loader.value.present();
  },
  dismiss: () => {
    if (loader.value) {
      loader.value.dismiss();
      loader.value = null as any;
    }
  }
}

export {
  login,
  loader,
  confirmSessionEnd,
  logout
}