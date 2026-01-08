import { createClient } from "@/lib/supabase/client";

export interface Table {
    id: string;
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: "rectangle" | "circle" | "square";
    seats: number;
    angle: number;
    created_at?: string;
    updated_at?: string;
    // Service State
    status?: "available" | "occupied" | "reserved" | "dirty";
    current_pax?: number;
    customer_id?: string;
    opened_at?: string;
}

export interface TableUpdatePayload {
    status?: "available" | "occupied" | "reserved" | "dirty";
    current_pax?: number;
    customer_id?: string | null;
    opened_at?: string | null;
}

export interface TableInsert {
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: "rectangle" | "circle" | "square";
    seats: number;
    angle: number;
}

/**
 * Get all tables for a specific floor (Real Layout)
 */
export async function getTables(floorId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("floor_id", floorId);

    if (error) {
        console.error("Error fetching tables:", error);
        return { data: null, error };
    }

    return { data: data as Table[], error: null };
}

/**
 * Create a single table
 */
export async function saveTable(table: TableInsert) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tables")
        .insert(table)
        .select()
        .single();

    if (error) {
        console.error("Error saving table details:", JSON.stringify(error, null, 2));
        return { data: null, error };
    }

    return { data: data as Table, error: null };
}

/**
 * Update a table
 */
export async function updateTable(tableId: string, updates: Partial<TableInsert>) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tables")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating table:", error);
        return { data: null, error };
    }

    return { data: data as Table, error: null };
}

/**
 * Delete a table
 */
export async function deleteTable(tableId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", tableId);

    if (error) {
        console.error("Error deleting table:", error);
        return { error };
    }

    return { error: null };
}

/**
 * Bulk save tables (replaces all tables for a floor - dangerous, use with caution)
 * Typically used if we wanted to 'save' the current canvas state as the new reality manually,
 * though normally updates might be granular.
 */
export async function bulkSaveTables(floorId: string, tables: Omit<TableInsert, "floor_id">[]) {
    const supabase = await createClient();

    // 1. Delete existing tables for this floor
    const { error: deleteError } = await supabase
        .from("tables")
        .delete()
        .eq("floor_id", floorId);

    if (deleteError) {
        console.error("Error deleting old tables in bulkSave:", JSON.stringify(deleteError, null, 2));
        return { data: null, error: deleteError };
    }

    // 2. Insert new tables
    if (tables.length === 0) {
        return { data: [], error: null };
    }

    const tablesToInsert = tables.map(t => ({
        ...t,
        floor_id: floorId,
    }));

    const { data, error } = await supabase
        .from("tables")
        .insert(tablesToInsert)
        .select();

    if (error) {
        console.error("Error bulk saving tables - Insert Payload:", JSON.stringify(tablesToInsert[0], null, 2)); // Log first item sample
        console.error("Error bulk saving tables - Supabase Error:", JSON.stringify(error, null, 2));
        return { data: null, error };
    }

    return { data: data as Table[], error: null };
}

/**
 * Update table status (Service Operation)
 */
export async function updateTableStatus(tableId: string, payload: TableUpdatePayload) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tables")
        .update(payload)
        .eq("id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating table status:", error);
        return { data: null, error };
    }

    return { data: data as Table, error: null };
}
