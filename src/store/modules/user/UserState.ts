export default interface UserState {
    token: string;
    current: any;
    currentFacility: object;
    instanceUrl: string;
    preference: any;
    locale: string;
    permissions: any;
    currentEComStore: any;
    partialOrderRejectionConfig: any
    notifications: any;
    notificationPrefs: any;
    firebaseDeviceId: string;
}