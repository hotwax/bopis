import { commonUtil, firebaseMessaging, logger, translate, useNotificationStore } from "@common";
import { alertForNotification } from "@/utils/firebaseUtil";
import { useNotificationHistoryStore } from "@/store/notificationHistory";

/**
 * Announce new open orders by diffing the list the Orders screen already polls, rather than by
 * waiting for a push to arrive.
 *
 * This is not a replacement for push: it can only fire while the app is open and running, so a
 * closed or suspended device still hears nothing. It covers the case where the app IS open, which
 * is exactly where push has been unreliable, and it depends on none of the push chain - no token,
 * no subscription, no topic, no service worker registration, no backend publish.
 */

/**
 * Enum id of the "new order" notification preference. Hardcoded the way the product store setting
 * ids are: it is stable OMS data, and the app already reads none of it back from the API.
 */
const NEW_ORDER_ENUM_ID = "NEW_BOPIS_ODR";

/**
 * Whether this device is subscribed to new order notifications for this facility.
 *
 * Read from getAllNotificationPrefs rather than getNotificationPrefs: only the former is loaded at
 * login, and the Orders screen never calls fetchNotificationPreferences, so the latter is usually
 * empty here. Those rows are already scoped to this device, so this answers "is THIS device
 * subscribed", which is the question that matters for an alert raised on this device.
 */
function isSubscribedToNewOrders(facilityId: string) {
  const topicName = firebaseMessaging.generateTopicName(commonUtil.getOMSInstanceName(), facilityId, NEW_ORDER_ENUM_ID);

  return (useNotificationStore().getAllNotificationPrefs || []).some((pref: any) => pref?.topic === topicName);
}

let trackedFacilityId = "";
/** null means nothing has been observed yet for this facility, which is not the same as "none". */
let seenOrderIds: Set<string> | null = null;

interface SyncOpenOrdersArgs {
  facilityId: string;
  orders: any[];
  /** A filtered list is not the facility's full set of open orders, see below. */
  isSearchActive?: boolean;
}

/** Drops the baseline so the next observation seeds silently instead of announcing. */
export function resetNewOrderTracking() {
  trackedFacilityId = "";
  seenOrderIds = null;
}

/**
 * One order, in the shape an FCM data message arrives in, so every consumer downstream reads it
 * the same way whether it came from push or from the diff.
 */
function buildOrderPayload(order: any) {
  return {
    // toStoredNotification keys the history row on messageId, so deriving it from the order makes
    // a repeat announcement update that row rather than adding a duplicate.
    messageId: `local-order-${order.orderId}`,
    data: {
      title: translate("New Order"),
      body: `${order.customerName} has placed ${order.orderName || order.orderId} for 1 item`,
      // showForegroundSystemNotification tags the banner with this, so re-announcing the same
      // order replaces its banner rather than stacking another.
      orderId: order.orderId
    }
  };
}

function buildAlertPayload(newOrders: any[]) {
  if (newOrders.length === 1) return buildOrderPayload(newOrders[0]);

  return {
    data: {
      title: translate("new orders to pack", { count: newOrders.length }),
      body: translate("Open the orders list to start picking.")
    }
  };
}

/**
 * Compare the current open orders against what has already been seen and alert on the difference.
 * Returns the orders judged new, so a caller can act on them without repeating the diff.
 */
export async function syncOpenOrders({ facilityId, orders, isSearchActive = false }: SyncOpenOrdersArgs) {
  if (!facilityId) return [];

  // A searched list is a subset, so it must neither seed nor be diffed: seeding from it would
  // treat every filtered-out order as new the moment the search is cleared, and diffing it would
  // announce orders that were already there.
  if (isSearchActive) return [];

  // A facility switch replaces the whole list, so the previous facility's baseline is meaningless.
  if (facilityId !== trackedFacilityId) {
    trackedFacilityId = facilityId;
    seenOrderIds = null;
  }

  const currentOrders = (orders || []).filter((order: any) => order?.orderId);

  // Startup, and the first observation after any reset, seeds silently. Orders already on screen
  // when the app opens are not news, and announcing them would be a burst of banners at login.
  if (seenOrderIds === null) {
    seenOrderIds = new Set(currentOrders.map((order: any) => order.orderId));
    return [];
  }

  const newOrders = currentOrders.filter((order: any) => !seenOrderIds?.has(order.orderId));

  // Recorded before alerting so a failure to display cannot make the same order announce again
  // on every subsequent poll.
  currentOrders.forEach((order: any) => seenOrderIds?.add(order.orderId));

  if (!newOrders.length) return [];

  // Checked after the baseline is updated, not before: an unsubscribed stretch must not leave a
  // gap that gets announced in one burst when the preference is switched back on.
  if (!isSubscribedToNewOrders(facilityId)) return [];

  try {
    // Every new order is recorded, not just the one named in a collapsed banner: the notifications
    // page is a log of orders rather than of alerts, and each row is keyed on its own order id.
    for (const order of newOrders) {
      await useNotificationHistoryStore().addNotification(buildOrderPayload(order));
    }

    await alertForNotification(buildAlertPayload(newOrders));
  } catch (error) {
    logger.error("Could not raise the new order alert", error);
  }

  return newOrders;
}

export const newOrderAlert = {
  syncOpenOrders,
  resetNewOrderTracking
}
