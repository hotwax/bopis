export default interface UserState {
    token: string;
    current: object | null;
    currentFacility: object;
    instanceUrl: string;
    shippingOrders: boolean;
    packingSlipEnabled: boolean;
}