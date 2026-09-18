// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const locale = vi.hoisted(() => ({ value: "en-US" }));
// Mirrors vue-i18n: a locale with no entry for the key gets the source string back unchanged,
// which is exactly the untranslated case this module has to detect.
const translations = vi.hoisted(() => ({ map: {} as Record<string, string> }));

vi.mock("@common", () => ({
  translate: (key: string) => translations.map[key] ?? key,
  i18n: { global: { locale } },
  logger: { warn: vi.fn(), error: vi.fn() }
}));

const {
  announcementLang,
  attachSpeechPrimer,
  isNotificationSoundEnabled,
  primeSpeechSynthesis,
  resetSpeechPrimingForTest,
  setNotificationSoundEnabled,
  showForegroundSystemNotification,
  speakNewOrder
} = await import("../src/utils/notificationAlert");

let spoken: any[] = [];
let speak: any;
let cancel: any;

function installSpeech() {
  spoken = [];
  speak = vi.fn((utterance: any) => { spoken.push(utterance); });
  cancel = vi.fn();
  Object.defineProperty(window, "speechSynthesis", { value: { speak, cancel }, configurable: true });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: vi.fn(function (this: any, text: string) { this.text = text; })
  });
}

function removeSpeech() {
  // delete leaves `"speechSynthesis" in window` false, which is what the guard reads.
  delete (window as any).speechSynthesis;
}

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
      clear: () => values.clear()
    }
  });
  Object.defineProperty(globalThis, "Notification", { value: { permission: "granted" }, configurable: true });
  locale.value = "en-US";
  translations.map = {};
  resetSpeechPrimingForTest();
  installSpeech();
});
afterEach(() => { vi.restoreAllMocks(); });

describe("sound preference", () => {
  it("is on by default and persists the user's choice", () => {
    expect(isNotificationSoundEnabled()).toBe(true);
    setNotificationSoundEnabled(false);
    expect(isNotificationSoundEnabled()).toBe(false);
    setNotificationSoundEnabled(true);
    expect(isNotificationSoundEnabled()).toBe(true);
  });

  it("falls back to on when storage is unreadable rather than going silent", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } }
    });
    expect(isNotificationSoundEnabled()).toBe(true);
    expect(() => setNotificationSoundEnabled(false)).not.toThrow();
  });
});

describe("speakNewOrder", () => {
  it("speaks the announcement and tags it with the app locale once it is translated", () => {
    locale.value = "es-ES";
    translations.map["New order received"] = "Nuevo pedido recibido";
    expect(speakNewOrder()).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledOnce();
    expect(spoken[0].text).toBe("Nuevo pedido recibido");
    // Without a lang, iOS can read the phrase with a voice for another language.
    expect(spoken[0].lang).toBe("es-ES");
    expect(spoken[0].volume).toBe(1);
  });

  it("keeps an English tag while a locale has not translated the phrase", () => {
    // es.json currently holds the English source. Tagging that es-ES would make a Spanish voice
    // mispronounce English, which is worse than not tagging at all.
    locale.value = "es-ES";
    expect(speakNewOrder()).toBe(true);
    expect(spoken[0].text).toBe("New order received");
    expect(spoken[0].lang).toBe("en-US");
  });

  it("stays silent once the user switches the preference off", () => {
    setNotificationSoundEnabled(false);
    expect(speakNewOrder()).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it("reports false instead of throwing where speech is unavailable", () => {
    removeSpeech();
    expect(speakNewOrder()).toBe(false);
  });
});

describe("announcementLang — the tag follows the text, not the app setting", () => {
  it("uses the app locale for a phrase that was actually translated", () => {
    expect(announcementLang("Nuevo pedido recibido", "es-ES")).toBe("es-ES");
    expect(announcementLang("新しい注文を受信しました", "ja-JP")).toBe("ja-JP");
  });

  it("falls back to English when the phrase came back untranslated", () => {
    expect(announcementLang("New order received", "es-ES")).toBe("en-US");
    expect(announcementLang("New order received", "ja-JP")).toBe("en-US");
  });

  it("falls back to English when the app reports no locale at all", () => {
    expect(announcementLang("Nuevo pedido recibido", "")).toBe("en-US");
  });
});

describe("speech priming — Safari will not speak until a gesture has", () => {
  it("primes with an inaudible utterance", () => {
    expect(primeSpeechSynthesis()).toBe(true);
    expect(speak).toHaveBeenCalledOnce();
    expect(spoken[0].volume).toBe(0);
  });

  it("primes only once, so later taps do not queue extra utterances", () => {
    expect(primeSpeechSynthesis()).toBe(true);
    expect(primeSpeechSynthesis()).toBe(false);
    expect(speak).toHaveBeenCalledOnce();
  });

  it("primes even while the preference is off, so switching it on mid-session still speaks", () => {
    setNotificationSoundEnabled(false);
    expect(primeSpeechSynthesis()).toBe(true);
  });

  it("primes on the first gesture anywhere and then unhooks both listeners", () => {
    // Asserting "spoke once" is not enough: the once-guard would satisfy it even if the
    // listeners stayed attached for the life of the app. Assert the removal itself.
    const removeSpy = vi.spyOn(document, "removeEventListener");
    attachSpeechPrimer();
    expect(speak).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("pointerdown"));
    expect(speak).toHaveBeenCalledOnce();
    expect(spoken[0].volume).toBe(0);

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toContain("pointerdown");
    expect(removed).toContain("keydown");

    document.dispatchEvent(new Event("pointerdown"));
    expect(speak).toHaveBeenCalledOnce();
  });
});

describe("showForegroundSystemNotification", () => {
  const fcmWorker = () => ({ showNotification: vi.fn().mockResolvedValue(undefined) }) as any;

  it("shows the banner through the registration it is given", async () => {
    const worker = fcmWorker();
    await expect(showForegroundSystemNotification(
      { notification: { title: "New BOPIS order", body: "Order 1001 is ready" }, messageId: "message-1" },
      worker
    )).resolves.toBe(true);
    expect(worker.showNotification).toHaveBeenCalledWith("New BOPIS order", expect.objectContaining({
      body: "Order 1001 is ready",
      tag: "message-1"
    }));
  });

  it("groups by order when the payload identifies one, so a re-send replaces its banner", async () => {
    const worker = fcmWorker();
    await showForegroundSystemNotification({ data: { title: "t", body: "b", orderId: "101277" }, messageId: "message-1" }, worker);
    expect(worker.showNotification.mock.calls[0][1].tag).toBe("bopis-order-101277");
  });

  it("keeps separate tags per message while the payload has no order id", async () => {
    const worker = fcmWorker();
    await showForegroundSystemNotification({ data: { title: "t", body: "b" }, messageId: "message-1" }, worker);
    await showForegroundSystemNotification({ data: { title: "t", body: "b" }, messageId: "message-2" }, worker);
    expect(worker.showNotification.mock.calls[0][1].tag).toBe("message-1");
    expect(worker.showNotification.mock.calls[1][1].tag).toBe("message-2");
  });

  it("does not show anything when permission is not granted", async () => {
    Object.defineProperty(globalThis, "Notification", { value: { permission: "default" }, configurable: true });
    const worker = fcmWorker();
    await expect(showForegroundSystemNotification({ data: { title: "t" } }, worker)).resolves.toBe(false);
    expect(worker.showNotification).not.toHaveBeenCalled();
  });

  it("reports false rather than throwing when the registration rejects", async () => {
    const worker = { showNotification: vi.fn().mockRejectedValue(new Error("no")) } as any;
    await expect(showForegroundSystemNotification({ data: { title: "t" } }, worker)).resolves.toBe(false);
  });

  it("reports false on a platform with no push worker and no usable constructor (iOS PWA)", async () => {
    // The caller passes null when it cannot find the FCM worker. iOS has no usable constructor
    // fallback, so this must report failure rather than look like it showed something.
    await expect(showForegroundSystemNotification({ data: { title: "t" } }, null)).resolves.toBe(false);
  });
});
