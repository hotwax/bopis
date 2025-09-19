export default interface UserState {
    token: string;
    current: any;
    instanceUrl: string;
    permissions: any;
    currentProductStore: any;
    partialOrderRejectionConfig: any
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
    hasUnreadNotifications: boolean;
    allNotificationPrefs: any;
    bopisProductStoreSettings: any;
    omsRedirectionUrl: string;
}