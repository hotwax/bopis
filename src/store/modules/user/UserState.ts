export default interface UserState {
    token: string;
    current: any;
    instanceUrl: string;
    permissions: any;
    currentEComStore: any;
    partialOrderRejectionConfig: any
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean;
    allNotificationPrefs: any;
    bopisProductStoreSettings: any;
}