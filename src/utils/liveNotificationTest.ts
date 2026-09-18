import { api, commonUtil, logger, useNotificationStore } from "@common";
import { firebaseUtil } from "@/utils/firebaseUtil";

/**
 * Prove the whole path from the server to THIS device: ask the backend to send the real new-order
 * push for a real open order, then wait for it to arrive here.
 *
 * Every earlier check in the app stops at the device's edge — permission, worker, token, topics.
 * They can all be green while the backend is publishing to nobody, and until now the only way to
 * know was to place an order and wait. This makes the round trip a button.
 *
 * Two honest limits, both from the backend contract rather than this code:
 *  - The endpoint publishes to the facility TOPIC, so every device subscribed at the facility gets
 *    the push, not only this one. The caller must say so before firing it.
 *  - Nothing in the request identifies the request, so receipt is matched by orderId when the
 *    payload carries one (hotwax/oms#1057) and by arrival time when it does not.
 */

export const RECEIPT_TIMEOUT_MS = 15000;
export const RECEIPT_POLL_MS = 250;

export type LiveTestStep = "device" | "order" | "send" | "receipt";

export interface LiveTestResult {
  ok: boolean;
  failedStep?: LiveTestStep;
  orderId?: string;
  orderName?: string;
  /** How long the push took to come back to this device, when it did. */
  receivedAfterMs?: number;
  detail?: string;
}

let inFlight = false;

/**
 * Newest open PICKUP order at the facility, asked for directly.
 *
 * Not read from the order store on purpose: that list is whatever the Orders tab last loaded, and
 * with "Show shipping orders" on it is shipping orders. The backend only publishes for orders with
 * a STOREPICKUP ship group (the same exact match as the real new-order trigger), so sending for a
 * shipping order is accepted and then silently notifies nobody — the one outcome this button
 * exists to rule out. Querying here also leaves the Orders tab's list untouched.
 */
export const PICKUP_ORDER_QUERY = {
  orderStatusId: "ORDER_APPROVED",
  shipmentStatusId: "SHIPMENT_INPUT,SHIPMENT_PACKED,SHIPMENT_SHIPPED",
  shipmentStatusId_op: "in",
  shipmentStatusId_not: "Y",
  shipmentMethodTypeId: "STOREPICKUP",
  shipmentMethodTypeId_op: "equals",
  pageSize: 20,
  pageIndex: 0
};

async function pickOpenOrder(facilityId: string): Promise<{ orderId: string; orderName?: string } | null> {
  const resp: any = await api({ url: "oms/orders/pickup", method: "get", params: { ...PICKUP_ORDER_QUERY, facilityId } });
  if (commonUtil.hasError(resp)) throw resp;
  const orders: any[] = [...(resp?.data?.orders ?? [])].sort((a, b) => (b.orderDate ?? 0) - (a.orderDate ?? 0));
  const order = orders[0];
  return order ? { orderId: order.orderId, orderName: order.orderName } : null;
}

/**
 * Resolve when a notification newer than `sentAt` arrives — for `orderId` when the payload names
 * one, otherwise the first new arrival — or with null once the timeout passes.
 */
export function waitForReceipt(sentAt: number, orderId: string, timeoutMs = RECEIPT_TIMEOUT_MS): Promise<number | null> {
  const store = useNotificationStore();
  const matches = (entry: any) => {
    if (!(entry?.time > sentAt)) return false;
    const payloadOrderId = entry?.data?.orderId;
    // A payload that names an order must name THIS one; one that does not is matched by time alone.
    return payloadOrderId ? payloadOrderId === orderId : true;
  };
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const hit = (store.getNotifications || []).find(matches);
      if (hit) return resolve(hit.time - sentAt);
      if (Date.now() - startedAt >= timeoutMs) return resolve(null);
      setTimeout(tick, RECEIPT_POLL_MS);
    };
    tick();
  });
}

export async function sendTestOrderNotification({ facilityId }: { facilityId: string }): Promise<LiveTestResult> {
  // A second tap while one is in flight would send a second real push to every device at the
  // facility and make the receipt ambiguous.
  if (inFlight) return { ok: false, failedStep: "send", detail: "A test is already in progress" };
  inFlight = true;

  try {
    // Refuse rather than send: the push would still go to everyone else at the facility, and this
    // device could never receive it, so the result would say nothing about the path being tested.
    if (!(await firebaseUtil.isDeviceSetUp())) {
      return { ok: false, failedStep: "device", detail: "This device is not registered for notifications" };
    }

    let order: { orderId: string; orderName?: string } | null;
    try {
      order = await pickOpenOrder(facilityId);
    } catch (error: any) {
      logger.error("Live notification test: could not look up an open pickup order", error);
      return { ok: false, failedStep: "order", detail: String(error?.response?.status ?? error?.data?._ERROR_MESSAGE_ ?? error?.message ?? error) };
    }
    if (!order) return { ok: false, failedStep: "order", detail: "No open pickup order at this facility to send for" };

    // Armed before the request leaves, so an arrival during the round trip is not missed.
    const sentAt = Date.now();
    const receipt = waitForReceipt(sentAt, order.orderId);

    try {
      const resp: any = await api({ url: `oms/orders/pickup/${order.orderId}/notification`, method: "post", data: {} });
      // api() resolves with an error body as well as throwing, so a bare try/catch is not enough.
      if (commonUtil.hasError(resp)) throw resp;
    } catch (error: any) {
      logger.error("Live notification test: the backend refused the send", error);
      return { ok: false, failedStep: "send", ...order, detail: String(error?.response?.status ?? error?.data?._ERROR_MESSAGE_ ?? error?.message ?? error) };
    }

    const receivedAfterMs = await receipt;
    if (receivedAfterMs === null) {
      logger.error("Live notification test: the backend accepted the send but nothing reached this device", { ...order, timeoutMs: RECEIPT_TIMEOUT_MS });
      return { ok: false, failedStep: "receipt", ...order, detail: `Sent, but nothing arrived within ${Math.round(RECEIPT_TIMEOUT_MS / 1000)}s` };
    }

    logger.warn("Live notification test: round trip complete", { ...order, receivedAfterMs });
    return { ok: true, ...order, receivedAfterMs };
  } finally {
    inFlight = false;
  }
}

/** Exported for tests. */
export function resetLiveTestForTest() { inFlight = false; }
