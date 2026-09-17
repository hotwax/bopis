// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  showForegroundSystemNotification,
  speakNewOrder,
} from "../src/utils/notificationAlert";

describe("notification alert preferences", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
      },
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("enables spoken alerts by default and persists the user choice", () => {
    expect(isNotificationSoundEnabled()).toBe(true);
    setNotificationSoundEnabled(false);
    expect(isNotificationSoundEnabled()).toBe(false);
    setNotificationSoundEnabled(true);
    expect(isNotificationSoundEnabled()).toBe(true);
  });

  it("speaks the short order alert when enabled", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, "speechSynthesis", { value: { speak, cancel }, configurable: true });
    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      value: vi.fn((text: string) => ({ text })),
      configurable: true,
    });

    expect(speakNewOrder()).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0].text).toBe("New order received");
  });

  it("does not speak after the user disables spoken alerts", () => {
    setNotificationSoundEnabled(false);
    Object.defineProperty(window, "speechSynthesis", { value: { speak: vi.fn(), cancel: vi.fn() }, configurable: true });
    expect(speakNewOrder()).toBe(false);
  });
});

describe("foreground system notifications", () => {
  it("uses an active service worker when one is available", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "Notification", { value: { permission: "granted" }, configurable: true });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { getRegistrations: vi.fn().mockResolvedValue([{ showNotification }]) },
      configurable: true,
    });

    await expect(showForegroundSystemNotification({
      notification: { title: "New BOPIS order", body: "Order 1001 is ready" },
      messageId: "message-1",
    })).resolves.toBe(true);
    expect(showNotification).toHaveBeenCalledWith("New BOPIS order", expect.objectContaining({
      body: "Order 1001 is ready",
      tag: "message-1",
    }));
  });
});
