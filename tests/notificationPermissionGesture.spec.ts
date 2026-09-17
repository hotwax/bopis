// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const initialiseFirebaseApp = vi.fn(async () => undefined);
vi.mock("@common", () => ({
  api: vi.fn(),
  commonUtil: { hasError: () => false },
  firebaseMessaging: {
    initialiseFirebaseApp: (...a: any[]) => initialiseFirebaseApp(...a),
    generateDeviceId: (e?: string) => e || "DEVICE1"
  },
  logger: { error: vi.fn(), warn: vi.fn() },
  useNotificationStore: () => ({ getFirebaseDeviceId: "", setFirebaseDeviceId: vi.fn(), addNotification: vi.fn(), isFirebaseInitialised: false })
}));

const { firebaseUtil } = await import("../src/utils/firebaseUtil");

function setPlatform(platform: string, maxTouchPoints: number, userAgent: string) {
  Object.defineProperty(globalThis.navigator, "platform", { value: platform, configurable: true });
  Object.defineProperty(globalThis.navigator, "maxTouchPoints", { value: maxTouchPoints, configurable: true });
  Object.defineProperty(globalThis.navigator, "userAgent", { value: userAgent, configurable: true });
}

function setPermission(value: string) {
  // @ts-expect-error jsdom provides no Notification; the code only reads .permission
  globalThis.Notification = { permission: value, requestPermission: async () => value };
}

describe("canInitialiseWithoutPrompting", () => {
  beforeEach(() => initialiseFirebaseApp.mockClear());

  it("is false before a decision, so login and mount cannot fire a prompt", () => {
    // iOS refuses a prompt outside a user gesture and leaves permission on "default", which is
    // exactly why the non-gesture call sites must skip rather than try and fail silently.
    setPermission("default");
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(false);
  });

  it("is false when notifications are blocked", () => {
    setPermission("denied");
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(false);
  });

  it("is true once granted, where requestPermission resolves without prompting anyone", () => {
    setPermission("granted");
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(true);
  });

  it("is false where the Notification API does not exist at all", () => {
    // @ts-expect-error deliberately removing the API
    delete globalThis.Notification;
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(false);
  });
});

describe("isApplePushPlatform", () => {
  it("reports an iPad as an Apple platform despite its desktop user agent", () => {
    // iPadOS 13+ claims to be a Mac; the tell is touch points, which a real Mac reports as 0.
    setPlatform("MacIntel", 5, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/26.5 Safari/605.1.15");
    expect(firebaseUtil.isApplePushPlatform()).toBe(true);
  });

  it("reports a real Mac as not an Apple push platform, so it gets browser recovery steps", () => {
    setPlatform("MacIntel", 0, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.6 Safari/605.1.15");
    expect(firebaseUtil.isApplePushPlatform()).toBe(false);
  });

  it("reports an iPhone as an Apple platform", () => {
    setPlatform("iPhone", 5, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Version/17.4 Mobile/15E148");
    expect(firebaseUtil.isApplePushPlatform()).toBe(true);
  });
});
