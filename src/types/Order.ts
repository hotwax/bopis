export interface Order {
    id: string;
    name: string;
    customer: any;
    /** An array containing the items purchased in this order */
    items?: Array<OrderItem>;
    /** An array containing the groups of items purchased in this order */
    itemGroup?: Array<OrderItemGroup>;
    total?: number;
    statusId?: string;
    identifications?: Array<any>;
}
export interface OrderItem {
    orderItemGroupId?: string;
    id?: string;
    productId?: string;
    quantity?: number;
    price?: number;
    amount?: number;
    statusId?: string;
}
export interface OrderItemGroup {
    id?: string;
    shippingAddress?: any;
    billingAddress?: any;
    shippingMethod?: any;
    carrier?: any;
    identifications?: Array<any>;
}