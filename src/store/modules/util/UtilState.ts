export default interface UtilState {
  rejectReasons: [];
  partyNames: any;
  cancelReasons: Array<any>;
  facilities: any;
  enumerations: any;
  facilitiesLatLng: {
    [facilityId :string]: { latitude: any , longitude: any }
  },
  storesInformation: any;
}