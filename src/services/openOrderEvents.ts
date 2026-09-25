/**
 * Event names shared with the open order watcher. Kept dependency free so the push handler can
 * signal the watcher without importing it, and with it the order store.
 */

/** Emitted with the orders judged new, so a page showing the open list can refresh it. */
export const NEW_OPEN_ORDERS_EVENT = "newOpenOrders";

/** Emitted by the push handler: a push is treated as a hint to check now, not as the alert itself. */
export const ORDER_PUSH_RECEIVED_EVENT = "orderPushReceived";
