export default interface UserState {
    token: string;
    current: object | null;
    currentFacility: object;
    currentStore: object;
    instanceUrl: string;
    shippingOrders: boolean;
}