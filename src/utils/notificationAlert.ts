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

const hasAudio = () => typeof window !== "undefined"
  && !!(window.AudioContext || (window as any).webkitAudioContext);

let isSpeechPrimed = false;
let isPrimerAttached = false;
let audioContext: AudioContext | null = null;

/**
 * One AudioContext for the app's lifetime.
 *
 * Browsers cap how many can exist, so a fresh one per notification eventually fails outright.
 * It starts suspended on iOS and is resumed by the primer below, inside a gesture.
 */
function getAudioContext(): AudioContext | null {
  if (!hasAudio()) return null;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext;
  } catch (error) {
    logger.warn("Could not create the audio context", error);
    return null;
  }
}

/**
 * The chime, as data so the wait before speaking can be derived from it rather than guessed —
 * change a note and the gap before the announcement follows automatically.
 */
const CHIME_NOTES = [
  { frequency: 880, startOffset: 0, duration: 0.18 },
  { frequency: 1320, startOffset: 0.10, duration: 0.40 }
];

/** How long the chime actually rings for. */
export const CHIME_DURATION_MS = Math.max(...CHIME_NOTES.map((n) => n.startOffset + n.duration)) * 1000;

/** A beat of silence after it, so the tone and the words are heard as two things, not one muddle. */
export const ANNOUNCEMENT_GAP_MS = 150;

/** One note of the chime: a sine tone with a fast attack and an exponential decay. */
function scheduleNote(context: AudioContext, frequency: number, startOffset: number, duration: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // Ramped rather than switched on: an instant gain change is audible as a click.
  const startAt = context.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

/**
 * The two-note cue that precedes the announcement — the same shape as the till sound Shopify uses.
 *
 * Synthesised rather than shipped as an audio file: no asset to bundle or license, and it works
 * offline. Returns false when audio is unavailable or still locked, so the caller can tell the
 * difference between "played" and "silently did nothing".
 */
export function playNewOrderChime(): boolean {
  const context = getAudioContext();
  if (!context || context.state === "suspended") return false;

  try {
    CHIME_NOTES.forEach((note) => scheduleNote(context, note.frequency, note.startOffset, note.duration));
    return true;
  } catch (error) {
    logger.warn("Could not play the new order chime", error);
    return false;
  }
}

/**
 * Unlock sound for this app session — both the chime and the spoken announcement.
 *
 * Safari refuses `speechSynthesis.speak()` until it has been called once inside a user gesture,
 * and an AudioContext stays suspended on the same rule. Both refusals are silent. A push arrives
 * without any gesture, so without this the first order of a session would make no sound at all —
 * the one a store associate most needs. A zero-volume utterance is inaudible but still counts as
 * the unlocking call.
 *
 * Must run synchronously inside a gesture handler: an await beforehand can end the transient
 * activation, the same way it does for the notification permission prompt.
 */
export function primeSpeechSynthesis(): boolean {
  let primedSomething = false;

  // Resumed every call, not just the first: iOS re-suspends the context when the app is
  // backgrounded, so a session that has already primed can still come back locked.
  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch((error) => logger.warn("Could not resume the audio context", error));
    primedSomething = true;
  }

  if (!isSpeechPrimed && hasSpeech()) {
    try {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
      isSpeechPrimed = true;
      primedSomething = true;
    } catch (error) {
      logger.warn("Could not prime speech synthesis", error);
    }
  }

  return primedSomething;
}

/**
 * Prime on the first tap anywhere in the app.
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
  audioContext = null;
}

/**
 * The full alert: the chime, then the spoken announcement.
 *
 * The tone carries across a shop floor and is recognised before the words are; the words say which
 * kind of alert it was. The speech waits for the chime to finish — started together they overlap
 * and neither is intelligible. When there is no chime to wait for, it speaks immediately.
 *
 * Returns true when something will sound, since a device with no speech voices still gets the
 * chime and a device with no Web Audio still gets the words.
 */
export async function announceNewOrder(): Promise<boolean> {
  if (!isNotificationSoundEnabled()) return false;

  if (!playNewOrderChime()) return speakNewOrder();

  await new Promise((resolve) => window.setTimeout(resolve, CHIME_DURATION_MS + ANNOUNCEMENT_GAP_MS));
  await speakNewOrder();
  return true;   // the chime played, so something sounded even if the words did not
}

/**
 * How long to wait for the engine to actually begin speaking before treating the call as failed.
 *
 * speechSynthesis.speak() returns without error even when nothing will ever play — Chrome wedges
 * after certain sequences and Safari refuses without a gesture, both silently. The only honest
 * signal is the utterance's own `start` event; long enough for a voice to load, short enough that
 * a fallback still lands while the order is news.
 */
export const SPEECH_START_TIMEOUT_MS = 1500;

/**
 * Speak one utterance and report whether the engine actually started it.
 *
 * Resolves on `start`, not `end`: "did sound begin" is the question, and waiting for the end would
 * hold the caller for the length of the sentence. A start that never comes is cancelled so a wedged
 * queue does not swallow the next attempt too.
 */
function speakUtterance(text: string, lang: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!hasSpeech()) return resolve(false);

    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const settle = (started: boolean) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      resolve(started);
    };

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.onstart = () => settle(true);
      utterance.onerror = (event) => {
        logger.warn("Speech synthesis reported an error", (event as any)?.error);
        settle(false);
      };
      watchdog = setTimeout(() => {
        logger.warn("Speech synthesis never started; cancelling", { lang });
        try { window.speechSynthesis.cancel(); } catch { /* nothing to recover here */ }
        settle(false);
      }, SPEECH_START_TIMEOUT_MS);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      logger.warn("Could not speak", error);
      settle(false);
    }
  });
}

export async function speakNewOrder(): Promise<boolean> {
  if (!isNotificationSoundEnabled() || !hasSpeech()) return false;

  const phrase = translate(ANNOUNCEMENT_SOURCE);
  // Without a language the platform picks a voice by its own rules, which on iOS can read the
  // phrase with a voice for another language.
  return speakUtterance(phrase, announcementLang(phrase, String(i18n.global.locale.value || "")));
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
