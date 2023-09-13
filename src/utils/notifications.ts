import { translate } from '@/i18n';
import { showToast } from '@/utils'

const showNewNotificationToast = () => {
  showToast(translate('New notification received.'));
}

export {
  showNewNotificationToast
}