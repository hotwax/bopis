import { Product } from "./Product";

export interface Order {
    id: string;
    name: string;
    customer: Customer;
    /** An array containing the items purchased in this order */
    items?: Array<OrderItem>;
    /** An array containing the groups of items purchased in this order */
    itemGroup?: Array<OrderItemGroup>;
    total?: number;
    statusId?: string;
    identifications?: Array<any>;
    orderDate?: string,
    shipmentId?: string
}
export interface OrderItem {
    orderItemGroupId?: string;
    id?: string;
    product?: Product;
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

export interface Customer {
    id?: string;
    name?: string;
    email?: string;
    phone?: number;
    address?: string
}