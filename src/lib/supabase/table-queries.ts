import { createClient } from "@/lib/supabase/client";

export interface TableRecord {
    id: string;
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: "square" | "rectangle" | "circle";
    seats: number;
    angle: number;
    created_at: string;
    updated_at: string;
}

export interface TableInsert {
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: "square" | "rectangle" | "circle";
    seats: number;
    angle: number;
}

/**
 * Get all tables for a specific floor
 */
export async function getTables(floorId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("floor_id", floorId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching tables:", error);
        return { data: null, error };
    }

    return { data: data as TableRecord[], error: null };
}

/**
 * Create a single table
 */
export async function saveTable(table: TableInsert) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tables")
        .insert(table)
        .select()
        .single();

    if (error) {
        console.error("Error saving table:", error);
        return { data: null, error };
    }

    return { data: data as TableRecord, error: null };
}

/**
 * Update a table
 */
export async function updateTable(tableId: string, updates: Partial<TableInsert>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("tables")
        .update(updates)
        .eq("id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating table:", error);
        return { data: null, error };
    }

    return { data: data as TableRecord, error: null };
}

/**
 * Delete a table
 */
export async function deleteTable(tableId: string) {
    const supabase = createClient();
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
 * Bulk save tables (replaces all tables for a floor)
 */
export async function bulkSaveTables(floorId: string, tables: Omit<TableInsert, "floor_id">[]) {
    const supabase = createClient();

    // Delete existing tables
    await supabase
        .from("tables")
        .delete()
        .eq("floor_id", floorId);

    // Insert new tables
    if (tables.length === 0) {
        return { data: [], error: null };
    }

    const tablesWithFloorId = tables.map(table => ({
        ...table,
        floor_id: floorId,
    }));

    const { data, error } = await supabase
        .from("tables")
        .insert(tablesWithFloorId)
        .select();

    if (error) {
        console.error("Error bulk saving tables:", error);
        return { data: null, error };
    }

    return { data: data as TableRecord[], error: null };
}

/**
 * Generate auto-incrementing label for a table/bar
 */
export async function generateTableLabel(floorId: string, type: "table" | "bar"): Promise<string> {
    const { data: tables } = await getTables(floorId);
    if (!tables) return type === "table" ? "Mesa 1" : "Barra 1";

    const prefix = type === "table" ? "Mesa" : "Barra";
    const existing = tables.filter(t => t.label.startsWith(prefix));
    const nextNumber = existing.length + 1;

    return `${prefix} ${nextNumber}`;
}
