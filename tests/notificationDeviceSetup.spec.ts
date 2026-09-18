// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** jsdom here provides no Storage, so the module under test needs one to exist. */
class MemoryStorage {
  private entries = new Map<string, string>();
  get length() { return this.entries.size; }
  key(i: number) { return [...this.entries.keys()][i] ?? null; }
  getItem(k: string) { return this.entries.has(k) ? (this.entries.get(k) as string) : null; }
  setItem(k: string, v: string) { this.entries.set(k, String(v)); }
  removeItem(k: string) { this.entries.delete(k); }
  clear() { this.entries.clear(); }
}

const api = vi.hoisted(() => vi.fn());
const initialiseFirebaseApp = vi.hoisted(() => vi.fn());
const isSupported = vi.hoisted(() => vi.fn());
const fetchAllNotificationPrefs = vi.hoisted(() => vi.fn(async () => undefined));
const store = vi.hoisted(() => ({ deviceId: "", isFirebaseInitialised: false, allPrefs: [] as any[] }));

vi.mock("@common", () => ({
  api: (...args: any[]) => api(...args),
  // Mirrors the real helper: an error BODY on a resolved response counts as failure.
  commonUtil: { hasError: (resp: any) => !!(resp?.data?._ERROR_MESSAGE_) },
  firebaseMessaging: {
    generateDeviceId: (existing?: string) => existing || "DEVICE1",
    initialiseFirebaseApp: (...args: any[]) => initialiseFirebaseApp(...args)
  },
  logger: { error: vi.fn(), warn: vi.fn() },
  useNotificationStore: () => ({
    get getFirebaseDeviceId() { return store.deviceId; },
    setFirebaseDeviceId: (id: string) => { store.deviceId = id; },
    get isFirebaseInitialised() { return store.isFirebaseInitialised; },
    set isFirebaseInitialised(value: boolean) { store.isFirebaseInitialised = value; },
    get getAllNotificationPrefs() { return store.allPrefs; },
    fetchAllNotificationPrefs,
    addNotification: vi.fn()
  })
}));
vi.mock("firebase/app", () => ({ getApp: vi.fn(), getApps: () => [] }));
vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  isSupported: (...args: any[]) => isSupported(...args)
}));

const {
  FCM_SW_PATH, FCM_SW_SCOPE, ensurePushWorker, isDeviceSetUp, setUpNotificationsOnThisDevice, waitForActivation
} = await import("../src/utils/firebaseUtil");

const CACHE_KEY = "bopis.fcm.registeredToken";

/** A ServiceWorker whose state the test controls and can advance. */
function fakeWorker(state = "activated") {
  const listeners = new Set<() => void>();
  return {
    state,
    scriptURL: `https://bopis.test${FCM_SW_PATH}`,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    become(next: string) { this.state = next; listeners.forEach((fn) => fn()); }
  };
}

function fakeRegistration(overrides: Record<string, any> = {}) {
  const registration: any = {
    scope: `https://bopis.test${FCM_SW_SCOPE}`,
    active: fakeWorker(),
    waiting: null,
    installing: null,
    update: vi.fn(async () => undefined),
    ...overrides
  };
  // Like a browser: once unregister() resolves, getRegistrations() no longer lists it.
  registration.unregister = vi.fn(async () => {
    const list = currentRegistrations;
    const index = list.indexOf(registration);
    if (index >= 0) list.splice(index, 1);
    return true;
  });
  return registration;
}

let currentRegistrations: any[] = [];

/** Let the awaits inside ensurePushWorker reach waitForActivation, so a statechange has a listener. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

function installServiceWorker(registrations: any[] = [], registerImpl?: (...args: any[]) => Promise<any>) {
  currentRegistrations = registrations;
  const register = vi.fn(registerImpl ?? (async () => {
    const created = fakeRegistration();
    registrations.push(created);
    return created;
  }));
  Object.defineProperty(navigator, "serviceWorker", {
    value: { getRegistrations: vi.fn(async () => registrations), register },
    configurable: true
  });
  return { register, registrations };
}

function installNotification(permission: string, resultOfPrompt = permission) {
  const requestPermission = vi.fn(async () => {
    (globalThis as any).Notification.permission = resultOfPrompt;
    return resultOfPrompt;
  });
  (globalThis as any).Notification = { permission, requestPermission };
  return requestPermission;
}

/** The SDK path: hands a token to the callback so registerToken runs for real against the api mock. */
function sdkIssuesToken(token = "TOKEN1") {
  initialiseFirebaseApp.mockImplementation(async (_config: any, _vapid: string, onToken: (t: string) => Promise<void>) => {
    await onToken(token);
  });
}

const calls = () => api.mock.calls.map(([cfg]: any[]) => `${cfg.method} ${cfg.url}`);

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
  api.mockReset(); api.mockResolvedValue({ status: 200, data: {} });
  initialiseFirebaseApp.mockReset();
  isSupported.mockReset(); isSupported.mockResolvedValue(true);
  fetchAllNotificationPrefs.mockClear();
  store.deviceId = ""; store.isFirebaseInitialised = false; store.allPrefs = [];
  vi.stubEnv("VITE_FIREBASE_CONFIG", JSON.stringify({ apiKey: "key", projectId: "p" }));
  vi.stubEnv("VITE_FIREBASE_VAPID_KEY", "VAPID");
  vi.stubEnv("VITE_NOTIF_APP_ID", "BOPIS");
  vi.useRealTimers();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("setUpNotificationsOnThisDevice — the whole chain from one tap", () => {
  it("registers a fresh device end to end and reports ok only after verifying it", async () => {
    installNotification("default", "granted");
    const { register } = installServiceWorker([]);
    sdkIssuesToken("TOKEN1");

    const result = await setUpNotificationsOnThisDevice({ userId: "100410" });

    expect(result.ok).toBe(true);
    expect(result.failedStep).toBeUndefined();
    // The worker was made active BEFORE the SDK was asked for a token.
    expect(register).toHaveBeenCalledWith(FCM_SW_PATH, { scope: FCM_SW_SCOPE });
    expect(register.mock.invocationCallOrder[0]).toBeLessThan(initialiseFirebaseApp.mock.invocationCallOrder[0]);
    expect(calls()).toEqual(["delete firebase/token", "post firebase/token"]);
    expect(result.deviceId).toBe("DEVICE1");
    expect(localStorage.getItem(CACHE_KEY)).toBe("TOKEN1");
    expect(store.isFirebaseInitialised).toBe(true);
    expect(fetchAllNotificationPrefs).toHaveBeenCalledWith("BOPIS", "100410");
  });

  it("asks for permission before the first async boundary, so the tap's activation is not spent", async () => {
    // isSupported() does async IndexedDB work on WebKit; awaiting it before the prompt can end the
    // transient user activation and leave permission stuck at "default" with no prompt shown.
    const requestPermission = installNotification("default", "granted");
    installServiceWorker([]);
    sdkIssuesToken();

    await setUpNotificationsOnThisDevice();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(isSupported).toHaveBeenCalledTimes(1);
    expect(requestPermission.mock.invocationCallOrder[0]).toBeLessThan(isSupported.mock.invocationCallOrder[0]);
  });

  it("stops at support when push is unavailable, after the (harmless) prompt", async () => {
    installNotification("default", "granted");
    installServiceWorker([]);
    isSupported.mockResolvedValue(false);

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "support" });
    expect(initialiseFirebaseApp).not.toHaveBeenCalled();
  });

  it("stops at support synchronously when the Notification API does not exist", async () => {
    delete (globalThis as any).Notification;
    installServiceWorker([]);

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "support" });
    expect(isSupported).not.toHaveBeenCalled();
  });

  it("stops at config when the build has no Firebase config, without prompting", async () => {
    const requestPermission = installNotification("default");
    installServiceWorker([]);
    vi.stubEnv("VITE_FIREBASE_CONFIG", "");

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "config" });
    expect(requestPermission).not.toHaveBeenCalled();
    expect(initialiseFirebaseApp).not.toHaveBeenCalled();
  });

  it("stops at permission when the prompt is refused, and never touches the worker or the SDK", async () => {
    installNotification("default", "denied");
    const { register } = installServiceWorker([]);

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "permission", permission: "denied" });
    expect(register).not.toHaveBeenCalled();
    expect(initialiseFirebaseApp).not.toHaveBeenCalled();
    expect(calls()).toEqual([]);
  });

  it("stops at serviceWorker when registration is rejected, before asking for a token", async () => {
    installNotification("default", "granted");
    installServiceWorker([], async () => { throw new Error("script served as text/html"); });

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "serviceWorker" });
    expect(result.steps.some((step) => !step.ok && /text\/html/.test(step.detail ?? ""))).toBe(true);
    expect(initialiseFirebaseApp).not.toHaveBeenCalled();
  });

  it("reports registration failure when the backend refuses the token, and stores no device id", async () => {
    installNotification("default", "granted");
    installServiceWorker([]);
    sdkIssuesToken("TOKEN1");
    api.mockImplementation(async (cfg: any) =>
      cfg.method === "post" ? { status: 200, data: { _ERROR_MESSAGE_: "refused" } } : { status: 200, data: {} });

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "registration" });
    expect(store.deviceId).toBe("");
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(store.isFirebaseInitialised).toBe(false);
  });

  it("reports registration failure when the SDK resolves without ever issuing a token", async () => {
    // initialiseFirebaseApp also resolves when it decides push is unsupported or permission was
    // not granted; before this change that path still flipped isFirebaseInitialised to true.
    installNotification("default", "granted");
    installServiceWorker([]);
    initialiseFirebaseApp.mockResolvedValue(undefined);

    const result = await setUpNotificationsOnThisDevice();

    expect(result).toMatchObject({ ok: false, failedStep: "registration" });
    expect(store.isFirebaseInitialised).toBe(false);
  });

  it("repairs the client-call state: granted, but the worker never activated", async () => {
    installNotification("granted");
    const stuck = fakeRegistration({ active: null, installing: fakeWorker("installing") });
    const { register, registrations } = installServiceWorker([stuck]);
    sdkIssuesToken("TOKEN1");

    const result = await setUpNotificationsOnThisDevice();

    expect(stuck.unregister).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith(FCM_SW_PATH, { scope: FCM_SW_SCOPE });
    expect(registrations.at(-1)?.active).toBeTruthy();
    expect(result.ok).toBe(true);
  });
});

describe("ensurePushWorker", () => {
  it("reuses an active worker without touching its subscription", async () => {
    const existing = fakeRegistration();
    const { register } = installServiceWorker([existing]);

    const registration = await ensurePushWorker();

    expect(registration).toBe(existing);
    expect(existing.update).toHaveBeenCalled();
    expect(existing.unregister).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it("replaces a worker stuck waiting, which would otherwise never take over", async () => {
    const existing = fakeRegistration({ waiting: fakeWorker("installed") });
    const { register } = installServiceWorker([existing]);

    await ensurePushWorker();

    expect(existing.unregister).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith(FCM_SW_PATH, { scope: FCM_SW_SCOPE });
  });

  it("waits for a freshly registered worker to activate instead of handing over an installing one", async () => {
    const installing = fakeWorker("installing");
    const created = fakeRegistration({ active: null, installing });
    installServiceWorker([], async () => created);

    const pending = ensurePushWorker();
    await settle();
    installing.become("activated");
    await expect(pending).resolves.toBe(created);
  });

  it("returns null when the new worker goes redundant", async () => {
    const installing = fakeWorker("installing");
    const created = fakeRegistration({ active: null, installing });
    installServiceWorker([], async () => created);

    const pending = ensurePushWorker();
    await settle();
    installing.become("redundant");
    await expect(pending).resolves.toBeNull();
  });

  it("does not wait on a worker that is already redundant", async () => {
    const created = fakeRegistration({ active: null, installing: fakeWorker("redundant") });
    installServiceWorker([], async () => created);
    await expect(ensurePushWorker()).resolves.toBeNull();
  });

  it("prefers the active registration when a legacy one matches too", async () => {
    const legacy = fakeRegistration({ scope: "https://bopis.test/", active: null, installing: fakeWorker("installing") });
    const scoped = fakeRegistration();
    installServiceWorker([legacy, scoped]);
    await expect(ensurePushWorker()).resolves.toBe(scoped);
    expect(legacy.unregister).not.toHaveBeenCalled();
  });
});

describe("waitForActivation", () => {
  it("gives up after the timeout when nothing ever changes", async () => {
    vi.useFakeTimers();
    const pending = waitForActivation(fakeRegistration({ active: null, installing: fakeWorker("installing") }), 500);
    vi.advanceTimersByTime(500);
    await expect(pending).resolves.toBe(false);
  });
});

describe("isDeviceSetUp — facts, not flags", () => {
  it("is false for a granted device with no active push worker, even with a device id and a cached token", async () => {
    installNotification("granted");
    installServiceWorker([]);
    store.deviceId = "DEVICE1";
    localStorage.setItem(CACHE_KEY, "TOKEN1");

    await expect(isDeviceSetUp()).resolves.toBe(false);
  });

  it("is false when the backend never confirmed a token, even with a worker and a device id", async () => {
    installNotification("granted");
    installServiceWorker([fakeRegistration()]);
    store.deviceId = "DEVICE1";

    await expect(isDeviceSetUp()).resolves.toBe(false);
  });

  it("is true only when permission, an active worker, a device id and a confirmed token all exist", async () => {
    installNotification("granted");
    installServiceWorker([fakeRegistration()]);
    store.deviceId = "DEVICE1";
    localStorage.setItem(CACHE_KEY, "TOKEN1");

    await expect(isDeviceSetUp()).resolves.toBe(true);
  });
});
