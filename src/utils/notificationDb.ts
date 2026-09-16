import { BaseDB, commonUtil, logger } from "@common";

export interface StoredNotification {
  /** FCM message id when the payload carries one, otherwise a locally generated id. */
  notificationId: string;
  title: string;
  body: string;
  /** Topic the message arrived on, as `/topics/<omsInstance>-<facilityId>-<enumId>`. */
  topic: string;
  receivedAt: number;
  /** Dexie cannot index booleans, so read state is stored as 0 / 1. */
  isRead: number;
}

const NOTIFICATIONS_TABLE = "notifications";

/**
 * The bell only shows recent activity, so the table is trimmed instead of growing without bound
 * on a shared store device that rarely logs out.
 */
const MAX_STORED_NOTIFICATIONS = 200;

let db: BaseDB | null = null;
let openedForInstance = "";
/** Set once IndexedDB has proven unusable so we stop retrying it on every message. */
let isStorageUnavailable = false;

function databaseName(omsInstance: string) {
  return `${omsInstance}-BopisDB`;
}

/**
 * Resolve the database for the OMS instance the user is currently signed in to.
 *
 * Returns null when there is no instance yet (pre-login) or when IndexedDB is unusable, which is
 * the case in private browsing and wherever site storage is blocked. Callers degrade to in-memory
 * history instead of failing.
 */
async function getDb(): Promise<BaseDB | null> {
  if (isStorageUnavailable) return null;

  const omsInstance = commonUtil.getOMSInstanceName();
  if (!omsInstance) return null;

  // Two tenants on one device must never share a database, so a change of instance opens a
  // different one rather than reusing the handle.
  if (db && openedForInstance === omsInstance) return db;

  if (db) {
    db.close();
    db = null;
    openedForInstance = "";
  }

  try {
    const instanceDb = new BaseDB(databaseName(omsInstance), {
      [NOTIFICATIONS_TABLE]: "notificationId, receivedAt, isRead"
    });
    await instanceDb.open();
    db = instanceDb;
    openedForInstance = omsInstance;
    return db;
  } catch (error) {
    // Deliberately not deleting and recreating the database here: losing the history is worse
    // than not showing it, and the caller keeps working from its in-memory copy.
    isStorageUnavailable = true;
    logger.error("Notification history storage is unavailable, keeping history in memory only", error);
    return null;
  }
}

export async function readNotifications(): Promise<StoredNotification[]> {
  const instanceDb = await getDb();
  if (!instanceDb) return [];

  try {
    const rows = await instanceDb.table<StoredNotification, string>(NOTIFICATIONS_TABLE).toArray();
    return rows.sort((a, b) => b.receivedAt - a.receivedAt);
  } catch (error) {
    logger.error("Failed to read notification history", error);
    return [];
  }
}

export async function writeNotification(notification: StoredNotification): Promise<void> {
  const instanceDb = await getDb();
  if (!instanceDb) return;

  try {
    const table = instanceDb.table<StoredNotification, string>(NOTIFICATIONS_TABLE);
    await table.put(notification);

    const total = await table.count();
    if (total > MAX_STORED_NOTIFICATIONS) {
      const stale = await table.orderBy("receivedAt").limit(total - MAX_STORED_NOTIFICATIONS).primaryKeys();
      await table.bulkDelete(stale);
    }
  } catch (error) {
    logger.error("Failed to persist notification", error);
  }
}

export async function markNotificationsRead(): Promise<void> {
  const instanceDb = await getDb();
  if (!instanceDb) return;

  try {
    await instanceDb.table<StoredNotification, string>(NOTIFICATIONS_TABLE).where("isRead").equals(0).modify({ isRead: 1 });
  } catch (error) {
    logger.error("Failed to mark notifications as read", error);
  }
}

/**
 * Build a stored record from an incoming FCM payload. The backend sends a data-only message with
 * just `title` and `body`; `messageId` is added by FCM and keeps the same message from being
 * stored twice when more than one tab receives the same service worker broadcast.
 */
export function toStoredNotification(payload: any, receivedAt: number): StoredNotification {
  return {
    notificationId: payload?.messageId || `${receivedAt}-${Math.random().toString(36).slice(2, 10)}`,
    title: payload?.data?.title || "",
    body: payload?.data?.body || "",
    topic: payload?.from || "",
    receivedAt,
    isRead: 0
  };
}
