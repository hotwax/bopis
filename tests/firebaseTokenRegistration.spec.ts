// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });

const api = vi.fn();
const setFirebaseDeviceId = vi.fn();

vi.mock("@common", () => ({
  api: (...args: any[]) => api(...args),
  // Mirrors the real helper: an error BODY on a resolved response counts as failure.
  commonUtil: { hasError: (resp: any) => !!(resp?.data?._ERROR_MESSAGE_) },
  firebaseMessaging: { generateDeviceId: (existing?: string) => existing || "DEVICE1" },
  logger: { error: vi.fn(), warn: vi.fn() },
  useNotificationStore: () => ({ getFirebaseDeviceId: "DEVICE1", setFirebaseDeviceId })
}));
vi.mock("firebase/app", () => ({ getApp: vi.fn(), getApps: () => [] }));
vi.mock("firebase/messaging", () => ({ getMessaging: vi.fn(), getToken: vi.fn() }));

const { registerToken } = await import("../src/utils/firebaseUtil");

const CACHE_KEY = "bopis.fcm.registeredToken";
const calls = () => api.mock.calls.map(([cfg]: any[]) => `${cfg.method}`);

describe("registerToken", () => {
  beforeEach(() => { storage.clear(); api.mockReset(); setFirebaseDeviceId.mockReset(); api.mockResolvedValue({ data: {} }); });

  it("replaces the backend row when nothing is cached, which is the upgrade case", async () => {
    // An empty cache is not proof the backend has no row. store#ClientRegistrationToken ignores a
    // changed token and returns early, so skipping the delete would strand the old token forever.
    const ok = await registerToken("NEW_TOKEN");

    expect(calls()).toEqual(["delete", "post"]);
    expect(ok).toBe(true);
    expect(storage.getItem(CACHE_KEY)).toBe("NEW_TOKEN");
  });

  it("replaces the backend row when the cached token has rotated", async () => {
    storage.setItem(CACHE_KEY, "OLD_TOKEN");

    await registerToken("NEW_TOKEN");

    expect(calls()).toEqual(["delete", "post"]);
    expect(storage.getItem(CACHE_KEY)).toBe("NEW_TOKEN");
  });

  it("skips the delete when the backend already holds this exact token", async () => {
    storage.setItem(CACHE_KEY, "SAME_TOKEN");

    await registerToken("SAME_TOKEN");

    expect(calls()).toEqual(["post"]);
  });

  it("does not cache a token the backend rejected by throwing", async () => {
    api.mockImplementation(async (cfg: any) => {
      if (cfg.method === "post") throw new Error("500");
      return { data: {} };
    });

    const ok = await registerToken("NEW_TOKEN");

    expect(ok).toBe(false);
    expect(storage.getItem(CACHE_KEY)).toBeNull();
    expect(setFirebaseDeviceId).not.toHaveBeenCalled();
  });

  it("does not cache a token the backend rejected with an error body", async () => {
    // api() resolves with _ERROR_MESSAGE_ rather than throwing, so a bare try/catch would
    // treat this as success and permanently stop retrying.
    api.mockImplementation(async (cfg: any) =>
      cfg.method === "post" ? { data: { _ERROR_MESSAGE_: "nope" } } : { data: {} });

    const ok = await registerToken("NEW_TOKEN");

    expect(ok).toBe(false);
    expect(storage.getItem(CACHE_KEY)).toBeNull();
  });

  it("still registers when a delete fails, since a missing row is a fine reason to fail", async () => {
    storage.setItem(CACHE_KEY, "OLD_TOKEN");
    api.mockImplementation(async (cfg: any) => {
      if (cfg.method === "delete") throw new Error("404");
      return { data: {} };
    });

    const ok = await registerToken("NEW_TOKEN");

    expect(ok).toBe(true);
    expect(storage.getItem(CACHE_KEY)).toBe("NEW_TOKEN");
  });
});
