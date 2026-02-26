import { translate } from '@hotwax/dxp-components';
import { useUserStore } from '@/store/user'
import { loadingController } from '@ionic/vue'

const login = async (payload: any) => useUserStore().login(payload);

const logout = async (payload: any) => useUserStore().logout(payload);

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
  logout
}