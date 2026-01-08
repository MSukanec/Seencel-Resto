import { createClient } from "@/lib/supabase/client";

export interface LayoutTemplate {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export interface LayoutTemplateItem {
    id: string;
    template_id: string;
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: string; // 'rectangle', 'circle', 'round'
    seats: number;
    angle: number;
}

export interface LayoutTemplateItemInsert {
    template_id: string;
    floor_id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: string;
    seats: number;
    angle: number;
}

/**
 * Get all layout templates for a restaurant
 */
export async function getLayoutTemplates(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("layout_templates")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching layout templates:", error);
        return { data: null, error };
    }

    return { data: data as LayoutTemplate[], error: null };
}

// Alias for compatibility
export const getTemplates = getLayoutTemplates;

/**
 * Get items for a specific template (optionally filtered by floor)
 */
export async function getTemplateItems(templateId: string, floorId?: string) {
    const supabase = createClient();
    let query = supabase
        .from("layout_template_items")
        .select("*")
        .eq("template_id", templateId);

    if (floorId) {
        query = query.eq("floor_id", floorId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching template items:", error);
        return { data: null, error };
    }

    return { data: data as LayoutTemplateItem[], error: null };
}

/**
 * Create a new layout template
 */
export async function createLayoutTemplate(template: Partial<LayoutTemplate> & { restaurant_id: string, name: string }) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("layout_templates")
        .insert(template)
        .select()
        .single();

    return { data, error };
}

// Alias/Helper for simple save
export async function saveTemplate(restaurantId: string, name: string) {
    return createLayoutTemplate({ restaurant_id: restaurantId, name });
}


/**
 * Update a layout template (e.g. name, is_active)
 */
export async function updateLayoutTemplate(id: string, updates: Partial<LayoutTemplate>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("layout_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    return { data, error };
}

// Alias
export const updateTemplate = updateLayoutTemplate;

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from("layout_templates")
        .delete()
        .eq("id", templateId);

    return { error };
}


/**
 * Replace all items for a template on a specific floor (Canvas Save)
 */
export async function replaceTemplateItems(templateId: string, floorId: string, items: Omit<LayoutTemplateItemInsert, "template_id" | "floor_id">[]) {
    const supabase = createClient();

    // 1. Delete existing items for this template on this floor
    const { error: deleteError } = await supabase
        .from("layout_template_items")
        .delete()
        .eq("template_id", templateId)
        .eq("floor_id", floorId);

    if (deleteError) {
        console.error("Error deleting old template items:", deleteError);
        return { error: deleteError };
    }

    // 2. Insert new items
    if (items.length === 0) return { data: [], error: null };

    const itemsToInsert = items.map(item => ({
        ...item,
        template_id: templateId,
        floor_id: floorId
    }));

    const { data, error } = await supabase
        .from("layout_template_items")
        .insert(itemsToInsert)
        .select();

    return { data, error };
}


/**
 * Apply a Template to the Real Layout (DESTRUCTIVE ACTION)
 * This overwrites the 'tables' table with items from 'layout_template_items'.
 */
export async function applyTemplateToFloor(templateId: string, floorId: string) {
    const supabase = createClient();

    // 1. Fetch template items
    const { data: templateItems, error: fetchError } = await supabase
        .from("layout_template_items")
        .select("*")
        .eq("template_id", templateId);

    if (fetchError) {
        console.error("Error fetching template items to apply:", fetchError);
        return { error: fetchError };
    }

    if (!templateItems) {
        return { error: new Error("Template not found or empty") };
    }

    // 2. Map items to 'Table' format
    // Note: We ignore the original 'floor_id' regarding WHERE the item was stored in the template,
    // and instead use the target 'floorId' we are applying TO.
    // Although typically templates are bound to a floor, this allows flexibility.
    const tablesToInsert = templateItems.map(item => ({
        floor_id: floorId,
        label: item.label,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        shape: item.shape,
        seats: item.seats,
        angle: item.angle
    }));

    // 3. Transactions are not natively supported in Client Library normally,
    // but we can do sequential operations.
    // Ideally this should be a stored procedure for atomicity, but for now:

    // A. Delete current live tables
    const { error: deleteError } = await supabase
        .from("tables")
        .delete()
        .eq("floor_id", floorId);

    if (deleteError) {
        console.error("Error clearing current floor tables:", deleteError);
        return { error: deleteError };
    }

    // B. Insert new tables
    if (tablesToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from("tables")
            .insert(tablesToInsert);

        if (insertError) {
            console.error("Error applying template tables:", insertError);
            return { error: insertError };
        }
    }

    return { error: null };
}
