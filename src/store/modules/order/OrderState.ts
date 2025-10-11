export default interface OrderState {
  open: any;                         // abhi bhi any rakh do
  orderItemRejectionHistory: any[];  // empty array type safe
  current: any;                       // any rakh do
  packed: any;
  completed: any;
  shipToStore: any;
  orders: any;
}
