import { i18n, logger, translate } from "@common";

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

const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * The English source string for the announcement.
 *
 * Locales that have not translated it yet get this back from translate() unchanged. Tagging that
 * English text as, say, Spanish makes a Spanish voice mispronounce English — worse than not
 * tagging at all — so the language tag follows the TEXT rather than the app's locale setting.
 * The moment a real translation is added the tag switches to the app locale on its own.
 */
const ANNOUNCEMENT_SOURCE = "New order received";

export function announcementLang(phrase: string, appLocale: string): string {
  return phrase === ANNOUNCEMENT_SOURCE ? "en-US" : (appLocale || "en-US");
}

let isSpeechPrimed = false;
let isPrimerAttached = false;

/**
 * Unlock speech for this app session.
 *
 * Safari refuses `speechSynthesis.speak()` until it has been called once inside a user gesture,
 * and the refusal is silent. A push arrives without any gesture, so without this the first order
 * of a session would never be announced — the one a store associate most needs. A zero-volume
 * utterance is inaudible but still counts as the unlocking call.
 *
 * Must run synchronously inside a gesture handler: an await beforehand can end the transient
 * activation, the same way it does for the notification permission prompt.
 */
export function primeSpeechSynthesis(): boolean {
  if (isSpeechPrimed || !hasSpeech()) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    isSpeechPrimed = true;
    return true;
  } catch (error) {
    logger.warn("Could not prime speech synthesis", error);
    return false;
  }
}

/**
 * Prime on the first tap anywhere in the app, once per session.
 *
 * Relying on someone pressing the test button in Settings only works for the session in which
 * they press it. An associate who opens the app and waits for orders presses nothing, and that is
 * exactly the case this feature exists for.
 */
export function attachSpeechPrimer(): void {
  if (isPrimerAttached || typeof document === "undefined") return;
  isPrimerAttached = true;

  const onFirstGesture = () => {
    primeSpeechSynthesis();
    document.removeEventListener("pointerdown", onFirstGesture);
    document.removeEventListener("keydown", onFirstGesture);
  };
  document.addEventListener("pointerdown", onFirstGesture);
  document.addEventListener("keydown", onFirstGesture);
}

/** Exported for tests: lets a spec start from a known un-primed state. */
export function resetSpeechPrimingForTest(): void {
  isSpeechPrimed = false;
  isPrimerAttached = false;
}

export function speakNewOrder(): boolean {
  if (!isNotificationSoundEnabled() || !hasSpeech()) return false;

  try {
    const phrase = translate(ANNOUNCEMENT_SOURCE);
    const utterance = new SpeechSynthesisUtterance(phrase);
    // Without a language the platform picks a voice by its own rules, which on iOS can read the
    // phrase with a voice for another language.
    utterance.lang = announcementLang(phrase, String(i18n.global.locale.value || ""));
    utterance.volume = 1;
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    logger.warn("Could not speak the new order alert", error);
    return false;
  }
}

/**
 * Show a system notification for a message that arrived while the app is in the foreground.
 *
 * `registration` must be the FCM push worker: that worker owns the `notificationclick` handler,
 * so a banner shown through any other registration does nothing when tapped — worse than showing
 * none. The caller resolves it, because importing the finder from firebaseUtil here would create
 * an import cycle (firebaseUtil already imports this module).
 */
export async function showForegroundSystemNotification(
  payload: any,
  registration?: ServiceWorkerRegistration | null
): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;

  const title = payload?.notification?.title || payload?.data?.title || translate(ANNOUNCEMENT_SOURCE);
  const body = payload?.notification?.body || payload?.data?.body || "";
  // Prefer the order: re-sending for one order should replace its banner rather than stack another.
  // orderId is not in the payload yet (hotwax/oms#1057 adds it); messageId keeps them distinct until then.
  const tag = payload?.data?.orderId
    ? `bopis-order-${payload.data.orderId}`
    : (payload?.messageId || payload?.data?.messageId || `bopis-${Date.now()}`);
  const options: NotificationOptions = {
    body,
    icon: "/img/icons/msapplication-icon-144x144.png",
    tag,
    data: { click_action: "/notifications" }
  };

  try {
    if (registration) {
      await registration.showNotification(title, options);
      return true;
    }

    // No push worker: desktop browsers can still show a page-owned notification. iOS cannot — the
    // constructor is unavailable in a standalone PWA — so there this correctly reports false
    // rather than appearing to have shown something.
    const notification = new Notification(title, options);
    notification.onclick = () => window.focus();
    return true;
  } catch (error) {
    logger.warn("Could not show the foreground system notification", error);
    return false;
  }
}
