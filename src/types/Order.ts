import { Product } from "./Product";
import { Status } from "./Status";

export interface Order {
    orderId: string;
    orderName: string;
    customer: Customer;
    /** An array containing the items purchased in this order */
    items?: Array<OrderItem>;
    /** An array containing the groups of items purchased in this order */
    parts?: Array<OrderPart>;
    grandTotal?: number;
    status?: Status;
    identifications?: Array<string>;
    placedDate?: string
    shipmentId?: string
}
export interface OrderItem {
    orderPartSeqId?: string;
    orderItemSeqId?: string;
    product?: Product;
    quantity?: number;
    unitListPrice?: number;
    unitAmount?: number;
    statusId?: string;
}
export interface OrderPart {
    orderPartSeqId?: string;
    shippingAddress?: any;
    billingAddress?: any;
    shipmentMethodEnum?: any;
    carrierPartyId?: any;
    identifications?: Array<any>;
}

export interface Customer {
    partyId?: string;
    name?: string;
    contactMech?: string;
    phone?: number;
    postalAddress?: string
}