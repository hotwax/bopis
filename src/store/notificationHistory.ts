import { defineStore } from "pinia";
import { DateTime } from "luxon";
import { markNotificationsRead, readNotifications, toStoredNotification, writeNotification, type StoredNotification } from "@/utils/notificationDb";

/**
 * Notification history lives in a per-OMS-instance IndexedDB rather than in the persisted
 * `@common` notification store, so it survives logout and is never shared between two tenants
 * signed in on the same device. This store is only the in-memory view of it and is deliberately
 * not persisted; IndexedDB is the source of truth.
 */
export const useNotificationHistoryStore = defineStore("notificationHistory", {
  state: () => ({
    notifications: [] as StoredNotification[]
  }),
  getters: {
    getNotifications: (state) => state.notifications,
    getUnreadCount: (state) => state.notifications.filter((notification) => !notification.isRead).length
  },
  actions: {
    async hydrate() {
      const storedNotifications = await readNotifications();
      // Keep the current in-memory history when IndexedDB is unavailable. Assigning the
      // sentinel as an empty list would erase notifications received during this session.
      if (storedNotifications !== null) this.notifications = storedNotifications;
    },
    async addNotification(payload: any) {
      const notification = toStoredNotification(payload, DateTime.now().toMillis());

      // Keep the in-memory list authoritative for the running session even when the write below
      // is a no-op because storage is unavailable.
      this.notifications = [notification, ...this.notifications.filter((existing) => existing.notificationId !== notification.notificationId)];
      await writeNotification(notification);
    },
    async markAllRead() {
      if (!this.notifications.some((notification) => !notification.isRead)) return;

      this.notifications = this.notifications.map((notification) => ({ ...notification, isRead: 1 }));
      await markNotificationsRead();
    }
  }
});
