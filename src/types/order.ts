// Order Types

export interface Order {
    id: string;
    restaurant_id: string;
    session_id: string | null;
    customer_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    order_type: "dine-in" | "pickup" | "delivery";
    status: "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
    order_number: number;
    subtotal: number;
    discount_percent: number;
    discount_amount: number;
    total: number;
    delivery_address: string | null;
    delivery_lat: number | null;
    delivery_lng: number | null;
    delivery_notes: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    confirmed_at: string | null;
    ready_at: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_variant: { name: string; price: number } | null;
    notes: string | null;
    status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
    sector_id: string | null;
    created_at: string;
    started_at: string | null;
    ready_at: string | null;
    delivered_at: string | null;
}

export interface OrderPayment {
    id: string;
    order_id: string;
    payer_name: string | null;
    amount: number;
    payment_method: "cash" | "card" | "transfer" | "other";
    status: "pending" | "paid" | "refunded";
    created_at: string;
    paid_at: string | null;
}

// Extended types with relations
export interface OrderWithItems extends Order {
    order_items: OrderItemWithDetails[];
    customer?: {
        id: string;
        first_name: string;
        last_name: string | null;
        phone: string | null;
    } | null;
    session?: {
        id: string;
        table_id: string | null;
        tables?: {
            label: string;
        } | null;
    } | null;
}

export interface OrderItemWithDetails extends OrderItem {
    menu_item: {
        id: string;
        name: string;
        image_url: string | null;
    };
    sector?: {
        id: string;
        name: string;
        color: string | null;
    } | null;
}

// For Kitchen Display (KDS)
export interface KitchenOrder {
    id: string;
    order_number: number;
    order_type: Order["order_type"];
    table_label: string | null;
    customer_name: string | null;
    elapsed_minutes: number;
    created_at: string;
    items: KitchenOrderItem[];
}

export interface KitchenOrderItem {
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
    variant: string | null;
    status: OrderItem["status"];
    sector_id: string | null;
    sector_name: string | null;
    sector_color: string | null;
}

// For creating orders
export interface CreateOrderInput {
    restaurant_id: string;
    session_id?: string;
    customer_id?: string;
    guest_name?: string;
    guest_phone?: string;
    order_type: Order["order_type"];
    discount_percent?: number;
    notes?: string;
    delivery_address?: string;
    delivery_lat?: number;
    delivery_lng?: number;
    delivery_notes?: string;
    items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    selected_variant?: { name: string; price: number };
    notes?: string;
    sector_id?: string;
}
