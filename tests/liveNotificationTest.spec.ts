// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => vi.fn());
const isDeviceSetUp = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ open: [] as any[], notifications: [] as any[] }));

vi.mock("@common", () => ({
  api: (...a: any[]) => api(...a),
  commonUtil: { hasError: (resp: any) => !!(resp?.data?._ERROR_MESSAGE_) },
  logger: { error: vi.fn(), warn: vi.fn() },
  useNotificationStore: () => ({ get getNotifications() { return state.notifications; } })
}));
vi.mock("@/utils/firebaseUtil", () => ({ firebaseUtil: { isDeviceSetUp: () => isDeviceSetUp() } }));

const { PICKUP_ORDER_QUERY, RECEIPT_TIMEOUT_MS, resetLiveTestForTest, sendTestOrderNotification, waitForReceipt } = await import("../src/utils/liveNotificationTest");

// GET answers with the open pickup orders; POST is the send.
const answerApi = (post: any = { status: 200, data: {} }) => api.mockImplementation(async (req: any) =>
  req.method === "get" ? { status: 200, data: { orders: state.open } } : post);
const postCalls = () => api.mock.calls.filter(([req]) => req.method === "post");

const ORDER = { orderId: "101277", orderName: "#L-4367", orderDate: 2 };
const arrive = (extra: any = {}) => state.notifications.unshift({ time: Date.now() + 1, data: { title: "t", body: "b", ...extra } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-18T10:00:00Z"));
  api.mockReset(); answerApi();
  isDeviceSetUp.mockReset(); isDeviceSetUp.mockResolvedValue(true);
  state.open = [ORDER]; state.notifications = [];
  resetLiveTestForTest();
});
afterEach(() => { vi.useRealTimers(); });

describe("sendTestOrderNotification — the round trip as one button", () => {
  it("sends for the newest open pickup order and reports the time it took to come back", async () => {
    state.open = [{ orderId: "100001", orderName: "#L-OLD", orderDate: 1 }, ORDER];
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(10);            // request leaves
    vi.setSystemTime(Date.now() + 1200); arrive({ orderId: "101277" });
    await vi.advanceTimersByTimeAsync(300);           // one poll
    const result = await pending;
    expect(result).toMatchObject({ ok: true, orderId: "101277", orderName: "#L-4367" });
    expect(result.receivedAfterMs).toBeGreaterThan(0);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "oms/orders/pickup/101277/notification", method: "post" }));
  });

  it("refuses to send at all when this device is not registered", async () => {
    isDeviceSetUp.mockResolvedValue(false);
    const result = await sendTestOrderNotification({ facilityId: "100013" });
    expect(result).toMatchObject({ ok: false, failedStep: "device" });
    // Sending would still ping every other device at the facility while proving nothing about this one.
    expect(api).not.toHaveBeenCalled();
  });

  it("asks the backend for PICKUP orders only, never the store's list, so a shipping order is never chosen", async () => {
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(10);
    const [getReq] = api.mock.calls.find(([req]) => req.method === "get")!;
    expect(getReq).toMatchObject({ url: "oms/orders/pickup", params: { facilityId: "100013", shipmentMethodTypeId: "STOREPICKUP", shipmentMethodTypeId_op: "equals" } });
    // The Orders tab adds this to flip the same query to SHIPPING orders; its presence here would defeat the point.
    expect(getReq.params).not.toHaveProperty("shipmentMethodTypeId_not");
    expect(PICKUP_ORDER_QUERY).not.toHaveProperty("shipmentMethodTypeId_not");
    await vi.advanceTimersByTimeAsync(RECEIPT_TIMEOUT_MS + 500); await pending;
  });

  it("stops when there is no open pickup order to send for", async () => {
    state.open = [];
    const result = await sendTestOrderNotification({ facilityId: "100013" });
    expect(result).toMatchObject({ ok: false, failedStep: "order" });
    expect(postCalls()).toHaveLength(0);
  });

  it("reports the order step, not a send, when the lookup itself fails", async () => {
    api.mockImplementation(async (req: any) => req.method === "get" ? { status: 200, data: { _ERROR_MESSAGE_: "solr down" } } : { status: 200, data: {} });
    const result = await sendTestOrderNotification({ facilityId: "100013" });
    expect(result).toMatchObject({ ok: false, failedStep: "order" });
    expect(postCalls()).toHaveLength(0);
  });

  it("reports a send failure when the backend answers with an error body, not just a throw", async () => {
    answerApi({ status: 200, data: { _ERROR_MESSAGE_: "nope" } });
    const result = await sendTestOrderNotification({ facilityId: "100013" });
    expect(result).toMatchObject({ ok: false, failedStep: "send" });
  });

  it("separates 'accepted' from 'received': a send with no arrival times out as a receipt failure", async () => {
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(RECEIPT_TIMEOUT_MS + 500);
    const result = await pending;
    expect(result).toMatchObject({ ok: false, failedStep: "receipt", orderId: "101277" });
    expect(postCalls()).toHaveLength(1);
  });

  it("ignores an arrival for a different order when the payload names one", async () => {
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(10);
    vi.setSystemTime(Date.now() + 500); arrive({ orderId: "999999" });
    await vi.advanceTimersByTimeAsync(RECEIPT_TIMEOUT_MS + 500);
    expect((await pending).failedStep).toBe("receipt");
  });

  it("accepts the first new arrival when the payload carries no order id (pre hotwax/oms#1057)", async () => {
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(10);
    vi.setSystemTime(Date.now() + 500); arrive();
    await vi.advanceTimersByTimeAsync(300);
    expect((await pending).ok).toBe(true);
  });

  it("ignores notifications that arrived before the send", async () => {
    state.notifications = [{ time: Date.now() - 5000, data: { orderId: "101277" } }];
    const pending = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(RECEIPT_TIMEOUT_MS + 500);
    expect((await pending).failedStep).toBe("receipt");
  });

  it("does not let a second tap send a second real push while one is in flight", async () => {
    const first = sendTestOrderNotification({ facilityId: "100013" });
    await vi.advanceTimersByTimeAsync(10);
    const second = await sendTestOrderNotification({ facilityId: "100013" });
    expect(second).toMatchObject({ ok: false, failedStep: "send" });
    expect(postCalls()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(RECEIPT_TIMEOUT_MS + 500); await first;
  });
});

describe("waitForReceipt", () => {
  it("resolves null after the timeout with nothing matching", async () => {
    const pending = waitForReceipt(Date.now(), "101277", 1000);
    await vi.advanceTimersByTimeAsync(1100);
    await expect(pending).resolves.toBeNull();
  });
});
