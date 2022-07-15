export default interface UserState {
    token: string;
    current: object | null;
    currentFacility: object;
    currentEComStore: object;
    instanceUrl: string;
    preference: any;
}