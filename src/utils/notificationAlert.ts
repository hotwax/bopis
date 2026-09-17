export const NOTIFICATION_SOUND_STORAGE_KEY = "bopis.notificationSoundEnabled";

const DEFAULT_SOUND_ENABLED = true;

export function isNotificationSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY);
    return stored === null ? DEFAULT_SOUND_ENABLED : stored === "true";
  } catch {
    return DEFAULT_SOUND_ENABLED;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // A blocked preference store should not prevent notification delivery.
  }
}

export function speakNewOrder(): boolean {
  if (!isNotificationSoundEnabled() || typeof window === "undefined" || !("speechSynthesis" in window)) return false;

  try {
    const utterance = new SpeechSynthesisUtterance("New order received");
    utterance.volume = 1;
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export async function showForegroundSystemNotification(payload: any): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;

  const title = payload?.notification?.title || payload?.data?.title || "New order received";
  const body = payload?.notification?.body || payload?.data?.body || "A new BOPIS order is ready for review.";
  const tag = payload?.messageId || payload?.data?.messageId || `bopis-${Date.now()}`;
  const options: NotificationOptions = {
    body,
    icon: "/img/icons/msapplication-icon-144x144.png",
    tag,
    data: { click_action: "/notifications" }
  };

  try {
    const registrations = typeof navigator === "undefined"
      ? []
      : [...((await navigator.serviceWorker?.getRegistrations?.()) ?? [])];
    const registration = registrations.find((candidate) => typeof candidate.showNotification === "function");
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }

    const notification = new Notification(title, options);
    notification.onclick = () => window.focus();
    return true;
  } catch {
    return false;
  }
}
