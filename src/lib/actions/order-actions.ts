"use server";

import { createClient } from "@/lib/supabase/server";
import {
    CreateOrderInput,
    Order,
    OrderItem,
    OrderWithItems,
    KitchenOrder,
    KitchenOrderItem
} from "@/types/order";

/**
 * Create a new order with items
 */
export async function createOrder(input: CreateOrderInput): Promise<{ success: boolean; order?: Order; error?: string }> {
    const supabase = await createClient();

    try {
        // Create the order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                restaurant_id: input.restaurant_id,
                session_id: input.session_id || null,
                customer_id: input.customer_id || null,
                guest_name: input.guest_name || null,
                guest_phone: input.guest_phone || null,
                order_type: input.order_type,
                discount_percent: input.discount_percent || 0,
                notes: input.notes || null,
                delivery_address: input.delivery_address || null,
                delivery_lat: input.delivery_lat || null,
                delivery_lng: input.delivery_lng || null,
                delivery_notes: input.delivery_notes || null,
                status: "pending",
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = input.items.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.unit_price * item.quantity,
            selected_variant: item.selected_variant || null,
            notes: item.notes || null,
            sector_id: item.sector_id || null,
            status: "pending",
        }));

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) throw itemsError;

        return { success: true, order };
    } catch (error: any) {
        console.error("Error creating order:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get orders for kitchen display (KDS)
 * If sectorId is provided, only returns items for that sector
 */
export async function getKitchenOrders(restaurantId: string, sectorId?: string): Promise<KitchenOrder[]> {
    const supabase = await createClient();

    // Get active orders (not delivered or cancelled)
    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            id,
            order_number,
            order_type,
            guest_name,
            created_at,
            session:sessions(
                id,
                tables:table_id(label)
            ),
            customer:customers(first_name, last_name),
            order_items(
                id,
                quantity,
                notes,
                selected_variant,
                status,
                sector_id,
                menu_item:menu_items(name),
                sector:kitchen_sectors(name, color)
            )
        `)
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "confirmed", "preparing", "ready"])
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching kitchen orders:", error);
        return [];
    }

    // Transform to KitchenOrder format
    const now = new Date();

    const result = (orders || []).map(order => {
        const createdAt = new Date(order.created_at);
        const elapsedMs = now.getTime() - createdAt.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / 60000);

        // Get table label from session
        let tableLabel: string | null = null;
        if (order.session && typeof order.session === "object") {
            const session = order.session as any;
            if (session.tables && session.tables.label) {
                tableLabel = session.tables.label;
            }
        }

        // Get customer name
        let customerName: string | null = order.guest_name;
        if (!customerName && order.customer && typeof order.customer === "object") {
            const customer = order.customer as any;
            customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
        }

        // Filter items by sector if sectorId is provided
        let orderItems = order.order_items || [];
        if (sectorId) {
            orderItems = orderItems.filter((item: any) => item.sector_id === sectorId);
        }

        // Map items
        const items: KitchenOrderItem[] = orderItems.map((item: any) => ({
            id: item.id,
            name: item.menu_item?.name || "Item desconocido",
            quantity: item.quantity,
            notes: item.notes,
            variant: item.selected_variant?.name || null,
            status: item.status,
            sector_id: item.sector_id,
            sector_name: item.sector?.name || null,
            sector_color: item.sector?.color || null,
        }));

        return {
            id: order.id,
            order_number: order.order_number,
            order_type: order.order_type as any,
            table_label: tableLabel,
            customer_name: customerName,
            elapsed_minutes: elapsedMinutes,
            created_at: order.created_at,
            items,
        };
    });

    // If filtering by sector, exclude orders with no items for that sector
    if (sectorId) {
        return result.filter(order => order.items.length > 0);
    }

    return result;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
    orderId: string,
    status: Order["status"]
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const updates: any = { status };

    // Set timestamp based on status
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "ready") updates.ready_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();

    const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

    if (error) {
        console.error("Error updating order status:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Update order item status (for KDS)
 */
export async function updateOrderItemStatus(
    itemId: string,
    status: OrderItem["status"]
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const updates: any = { status };

    // Set timestamp based on status
    if (status === "preparing") updates.started_at = new Date().toISOString();
    if (status === "ready") updates.ready_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();

    const { error } = await supabase
        .from("order_items")
        .update(updates)
        .eq("id", itemId);

    if (error) {
        console.error("Error updating order item status:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Get order by ID with all details
 */
export async function getOrderById(orderId: string): Promise<OrderWithItems | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            customer:customers(id, first_name, last_name, phone),
            session:sessions(
                id,
                table_id,
                tables:table_id(label)
            ),
            order_items(
                *,
                menu_item:menu_items(id, name, image_url),
                sector:kitchen_sectors(id, name, color)
            )
        `)
        .eq("id", orderId)
        .single();

    if (error) {
        console.error("Error fetching order:", error);
        return null;
    }

    return data as OrderWithItems;
}

/**
 * Get orders for a restaurant
 */
export async function getRestaurantOrders(
    restaurantId: string,
    options?: {
        status?: Order["status"][];
        limit?: number;
        offset?: number;
    }
): Promise<OrderWithItems[]> {
    const supabase = await createClient();

    let query = supabase
        .from("orders")
        .select(`
            *,
            customer:customers(id, first_name, last_name, phone),
            session:sessions(
                id,
                table_id,
                tables:table_id(label)
            ),
            order_items(
                *,
                menu_item:menu_items(id, name, image_url),
                sector:kitchen_sectors(id, name, color)
            )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

    if (options?.status && options.status.length > 0) {
        query = query.in("status", options.status);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching orders:", error);
        return [];
    }

    return (data || []) as OrderWithItems[];
}

/**
 * Check if all items in an order are ready, and update order status
 */
export async function checkAndUpdateOrderReadyStatus(orderId: string): Promise<void> {
    const supabase = await createClient();

    // Get all non-cancelled items
    const { data: items, error } = await supabase
        .from("order_items")
        .select("status")
        .eq("order_id", orderId)
        .neq("status", "cancelled");

    if (error || !items) return;

    // Check if all items are ready or delivered
    const allReady = items.every(item =>
        item.status === "ready" || item.status === "delivered"
    );

    if (allReady && items.length > 0) {
        await updateOrderStatus(orderId, "ready");
    }
}
