// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const api = vi.hoisted(() => vi.fn());
const initialiseFirebaseApp = vi.hoisted(() => vi.fn());
const store = vi.hoisted(() => {
  const s: any = {
    isFirebaseInitialised: false,
    getFirebaseDeviceId: "",
    getAllNotificationPrefs: [],
    addNotification: vi.fn(),
    subscribeTopic: vi.fn(),
    fetchAllNotificationPrefs: vi.fn()
  };

  s.setFirebaseDeviceId = (id: string) => { s.getFirebaseDeviceId = id; };

  return s;
});

vi.mock("@common", () => ({
  api,
  commonUtil: { hasError: (resp: any) => !!resp?.data?._ERROR_MESSAGE_ },
  firebaseMessaging: { initialiseFirebaseApp, generateDeviceId: (id?: string) => id || "NEW-ID" },
  logger: { error: vi.fn(), warn: vi.fn() },
  useNotificationStore: () => store
}));
const getToken = vi.hoisted(() => vi.fn());

vi.mock("firebase/app", () => ({ getApp: vi.fn(), getApps: () => [{}] }));
vi.mock("firebase/messaging", () => ({ isSupported: () => Promise.resolve(true), getMessaging: vi.fn(), getToken }));

const { firebaseUtil } = await import("@/utils/firebaseUtil");
const { useNotificationSetupStore } = await import("@/store/notificationSetup");
const { useNotificationDeviceSetup } = await import("@/composables/useNotificationDeviceSetup");

setActivePinia(createPinia());
const setup = useNotificationSetupStore();
const deviceSetup = useNotificationDeviceSetup();

// An already active FCM worker, so initialise goes straight to the Firebase app.
const activeWorker = { scope: "https://app/firebase-cloud-messaging-push-scope", active: { state: "activated" }, update: vi.fn() };

beforeEach(() => {
  vi.stubEnv("VITE_FIREBASE_CONFIG", JSON.stringify({ apiKey: "key" }));
  vi.stubEnv("VITE_FIREBASE_VAPID_KEY", "vapid");
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistrations: () => Promise.resolve([activeWorker]) } });
  (globalThis as any).Notification = { permission: "granted", requestPermission: vi.fn(() => Promise.resolve("granted")) };
  localStorage.clear();
  store.isFirebaseInitialised = false;
  store.getFirebaseDeviceId = "DEVICE-A";
  store.getAllNotificationPrefs = [];
  store.addNotification.mockReset();
  store.subscribeTopic.mockReset().mockResolvedValue(true);
  store.fetchAllNotificationPrefs.mockReset().mockResolvedValue(undefined);
  api.mockReset().mockResolvedValue({ status: 200, data: {} });
  initialiseFirebaseApp.mockReset();
});

const issuesToken = (token = "TOKEN") => initialiseFirebaseApp.mockImplementation(async (_config: any, _vapid: any, onToken: any) => {
  await onToken(token);

  return { status: "token" };
});

describe("initialiseFirebaseMessaging (#867)", () => {
  it("marks the device initialised only once the backend accepted its token", async () => {
    issuesToken();

    await expect(setup.initialiseFirebaseMessaging()).resolves.toBe(true);
    expect(store.isFirebaseInitialised).toBe(true);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "firebase/token", method: "post", data: expect.objectContaining({ registrationToken: "TOKEN", deviceId: "DEVICE-A" }) }));
  });

  it("leaves the flag off when permission was refused, so a later Enable or reload tries again", async () => {
    initialiseFirebaseApp.mockResolvedValue({ status: "permission", permission: "denied" });

    await expect(setup.initialiseFirebaseMessaging()).resolves.toBe(false);
    expect(store.isFirebaseInitialised).toBe(false);
  });

  it("leaves the flag off when the backend answers the token POST with an error body", async () => {
    issuesToken();
    api.mockResolvedValue({ status: 200, data: { _ERROR_MESSAGE_: "refused" } });

    await expect(setup.initialiseFirebaseMessaging()).resolves.toBe(false);
    expect(store.isFirebaseInitialised).toBe(false);
  });

  it("delivers each notification once even after initialising again", async () => {
    const handlers: any[] = [];

    initialiseFirebaseApp.mockImplementation(async (_c: any, _v: any, onToken: any, onMessage: any) => {
      handlers.push(onMessage);
      await onToken("TOKEN");

      return { status: "token" };
    });
    await setup.initialiseFirebaseMessaging();
    await setup.initialiseFirebaseMessaging();
    handlers.forEach((handler) => handler({ notification: { data: { title: "New order" } }, isForeground: true }));

    expect(store.addNotification).toHaveBeenCalledTimes(1);
  });
});

describe("subscriptions stay per device", () => {
  it("registers the token without subscribing this device to topics switched on elsewhere", async () => {
    issuesToken();
    store.getAllNotificationPrefs = [{ topic: "oms-STORE1-NEW_ORDER", deviceId: "DEVICE-B" }];

    await setup.initialiseFirebaseMessaging();

    expect(store.subscribeTopic).not.toHaveBeenCalled();
    expect(store.fetchAllNotificationPrefs).not.toHaveBeenCalled();
  });
});

describe("permission prompts", () => {
  it("lets login and app mount initialise only when no prompt would be shown", () => {
    (globalThis as any).Notification.permission = "default";
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(false);

    (globalThis as any).Notification.permission = "granted";
    expect(firebaseUtil.canInitialiseWithoutPrompting()).toBe(true);
  });

  it("asks only while permission is undecided", async () => {
    (globalThis as any).Notification.permission = "denied";

    await expect(firebaseUtil.requestNotificationPermissionFromGesture()).resolves.toBe("denied");
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("Enable asks for permission before its first await, so the tap's gesture is still live", () => {
    (globalThis as any).Notification.permission = "default";
    deviceSetup.setUpNotificationsOnThisDevice();

    expect((globalThis as any).Notification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("Enable stops at the permission step and names it when the user refuses", async () => {
    (globalThis as any).Notification.permission = "default";
    (globalThis as any).Notification.requestPermission = vi.fn(() => Promise.resolve("denied"));

    const result = await deviceSetup.setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "permission" });
    expect(initialiseFirebaseApp).not.toHaveBeenCalled();
  });

  it("Enable names why registration failed, from the store's last initialise error", async () => {
    initialiseFirebaseApp.mockResolvedValue({ status: "unsupported" });

    const result = await deviceSetup.setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "registration" });
    expect(result.steps.at(-1)?.detail).toBe("Firebase reports push is not supported in this context");
  });
});

describe("token rotation (#879)", () => {
  // The resume check runs at most once a minute, so each case starts a minute after the last.
  let clock = Date.now();
  const resume = async () => {
    clock += 2 * 60 * 1000;
    vi.setSystemTime(clock);
    window.dispatchEvent(new Event("focus"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  it("re-registers a rotated token when the app comes back, deleting the old row first", async () => {
    issuesToken("OLD");
    await setup.initialiseFirebaseMessaging();
    api.mockClear();
    getToken.mockResolvedValue("ROTATED");

    await resume();

    expect(api.mock.calls.map(([cfg]: any[]) => cfg.method)).toEqual(["delete", "post"]);
    expect(api).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ registrationToken: "ROTATED" }) }));
  });

  it("does nothing on resume for a device not registered in this session, such as after logout", async () => {
    store.isFirebaseInitialised = false;
    getToken.mockResolvedValue("ROTATED");

    await resume();

    expect(api).not.toHaveBeenCalled();
  });
});
