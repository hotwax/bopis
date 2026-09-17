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
