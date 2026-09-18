/**
 * App actions mapped to the server permissions they require.
 *
 * Views, components and routes should always refer to an action from this file instead of
 * hardcoding a server permission, so that a permission change is a one line change here.
 *
 * The value is the permission expression evaluated by `hasPermission` of the user store.
 * It supports the `OR` and `AND` operators, and an empty value means the action is allowed
 * for every logged in user.
 */
export default {
  APP_ORDERS_VIEW: "",
  APP_CATALOG_VIEW: "",
  APP_ORDER_DETAIL_VIEW: "",
  APP_PRODUCT_DETAIL_VIEW: "",
  APP_ORDER_UPDATE: "",
  APP_CANCEL_BOPIS_ORDER: "ORD_SALES_ORDER_CNCL",
  APP_REQUEST_TRANSFER_UPDATE: "BOPIS_REQUEST_TRANSFER_UPDATE",
  APP_PROOF_OF_DELIVERY_PREF_UPDATE: "BOPIS_POD_UPDATE",
  APP_STOREFULFILLMENT_ADMIN: "STOREFULFILLMENT_ADMIN",
  APP_PRODUCT_IDENTIFIER_UPDATE: "STOREFULFILLMENT_ADMIN",
  APP_RF_CONFIG_UPDATE: "COMMON_ADMIN",
  APP_PARTIAL_ORDER_REJECTION_CONFIG_UPDATE: "COMMON_ADMIN",
  APP_SHOW_SHIPPING_ORD_PREF_UPDATE: "COMMON_ADMIN",
  APP_PRINT_PACKING_SLIP_PREF_UPDATE: "COMMON_ADMIN",
  APP_ENABLE_TRACKING_PREF_UPDATE: "COMMON_ADMIN",
  APP_PRINT_PICKLIST_PREF_UPDATE: "COMMON_ADMIN",
  APP_PWA_STANDALONE_ACCESS: "COMMON_ADMIN",
  APP_COMMERCE_VIEW: "COMMERCEUSER_VIEW"
} as const satisfies Record<string, string>
