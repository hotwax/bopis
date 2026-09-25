import { api, commonUtil, emitter, logger } from "@common";
import { buildOpenOrdersQuery } from "@/store/order";
import { newOrderAlert } from "@/utils/newOrderAlert";
import { NEW_OPEN_ORDERS_EVENT, ORDER_PUSH_RECEIVED_EVENT } from "@/services/openOrderEvents";

/**
 * Watches the facility's open orders for as long as the user is logged in, whichever page is on
 * screen, and raises the new order alert for anything that appears.
 *
 * Detection used to live in the Orders page's auto refresh, so it stopped whenever the user left
 * that page, switched segment or searched. This owns its own timer and its own fetch instead, and
 * never touches the order store, so nothing a page does can pause it or narrow what it sees.
 *
 * It still only runs while the app is running. A closed or suspended device relies on push alone.
 */

const POLL_INTERVAL_MS = 60 * 1000;

let watchedFacilityId = "";
let timer: ReturnType<typeof setInterval> | null = null;
/** Bumped on every start and stop, so a fetch that outlives its facility is discarded. */
let generation = 0;
let isChecking = false;
/** A check requested mid-fetch may be for an order that fetch started too early to include. */
let isRecheckPending = false;
let areListenersAttached = false;

/**
 * Every open order for the facility, of every shipment method: the store pickup query and the
 * shipping orders query, the same two the Open segment runs. Returns null on any failure, because
 * seeding the baseline from a partial list would announce the missing orders on the next check.
 */
async function fetchAllOpenOrders(facilityId: string): Promise<any[] | null> {
  const ordersById = new Map<string, any>();

  try {
    for (const showShippingOrders of [false, true]) {
      const queryParams = buildOpenOrdersQuery({ facilityId, viewIndex: 0, showShippingOrders });
      let fetched = 0;
      let total = 0;

      do {
        const resp = await api({ url: "oms/orders/pickup", method: "get", params: queryParams }) as any;
        // A 200 without an orders array is not "no orders": seeding from it would announce every
        // open order on the next check.
        if (resp?.status !== 200 || commonUtil.hasError(resp) || !Array.isArray(resp.data?.orders)) throw resp;

        const orders = resp.data.orders;
        total = resp.data?.ordersCount || 0;
        fetched += orders.length;
        queryParams.pageIndex++;

        orders.forEach((order: any) => {
          if (!order?.orderId) return;
          const existing = ordersById.get(order.orderId);
          // An order split across methods comes back from both queries with different ship groups.
          ordersById.set(order.orderId, existing
            ? { ...existing, shipGroups: [...(existing.shipGroups || []), ...(order.shipGroups || [])] }
            : order);
        });

        if (!orders.length) break;
      } while (fetched < total);
    }
  } catch (error) {
    logger.error("New order watcher could not fetch open orders", error);
    return null;
  }

  return [...ordersById.values()];
}

/** Check for new orders right now. Safe to call at any time; overlapping calls are collapsed. */
export async function checkNow() {
  if (!watchedFacilityId) return;
  if (isChecking) {
    isRecheckPending = true;
    return;
  }

  isChecking = true;
  try {
    do {
      isRecheckPending = false;
      const facilityId = watchedFacilityId;
      const checkGeneration = generation;

      const orders = await fetchAllOpenOrders(facilityId);
      if (!orders || checkGeneration !== generation) continue;

      const newOrders = await newOrderAlert.syncOpenOrders({ facilityId, orders });
      if (newOrders.length) emitter.emit(NEW_OPEN_ORDERS_EVENT, newOrders);
    } while (isRecheckPending && watchedFacilityId);
  } finally {
    isChecking = false;
  }
}

function onVisibilityChange() {
  // Timers are throttled or frozen while hidden, so catch up the moment the app is back.
  if (document.visibilityState === "visible") checkNow();
}

function attachListeners() {
  if (areListenersAttached) return;
  areListenersAttached = true;

  document.addEventListener("visibilitychange", onVisibilityChange);
  emitter.on(ORDER_PUSH_RECEIVED_EVENT, checkNow);
}

/** Start watching a facility. Restarting for a different facility drops the old baseline. */
export function start(facilityId: string) {
  if (!facilityId) return stop();
  if (facilityId === watchedFacilityId && timer) return;

  stop();
  watchedFacilityId = facilityId;
  attachListeners();

  // The first check seeds the baseline silently; only later checks announce.
  checkNow();
  timer = setInterval(checkNow, POLL_INTERVAL_MS);
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  watchedFacilityId = "";
  generation++;
  newOrderAlert.resetNewOrderTracking();
}

export const openOrderWatcher = {
  start,
  stop,
  checkNow
}
