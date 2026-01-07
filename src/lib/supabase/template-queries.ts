import { createClient } from "@/lib/supabase/client";
import { getFloorsForRestaurant } from "./floor-queries";
import { bulkSaveTables, getTables } from "./table-queries";

export interface LayoutTemplate {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
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
    shape: "square" | "rectangle" | "circle";
    seats: number;
    angle: number;
}

/**
 * Get all templates for a restaurant
 */
export async function getTemplates(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("layout_templates")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

    return { data: data as LayoutTemplate[], error };
}

/**
 * Save current layout as a new template
 */
export async function saveTemplate(restaurantId: string, name: string, description?: string) {
    const supabase = createClient();

    // 1. Create Template Metadata
    const { data: template, error: tmplError } = await supabase
        .from("layout_templates")
        .insert({
            restaurant_id: restaurantId,
            name,
            description
        })
        .select()
        .single();

    if (tmplError || !template) {
        console.error("Error creating template:", tmplError);
        return { error: tmplError };
    }

    // 2. Fetch All Floors
    const { data: floors } = await getFloorsForRestaurant(restaurantId);
    if (!floors) return { error: "No floors found" };

    // 3. Collect All Tables from All Floors
    let allTables: any[] = [];
    for (const floor of floors) {
        const { data: tables } = await getTables(floor.id);
        if (tables) {
            allTables = [...allTables, ...tables];
        }
    }

    // 4. Save Items to Template
    if (allTables.length > 0) {
        const items = allTables.map(t => ({
            template_id: template.id,
            floor_id: t.floor_id,
            label: t.label,
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            shape: t.shape,
            seats: t.seats,
            angle: t.angle
        }));

        const { error: itemsError } = await supabase
            .from("layout_template_items")
            .insert(items);

        if (itemsError) {
            console.error("Error saving template items:", itemsError);
            await deleteTemplate(template.id); // Rollback
            return { error: itemsError };
        }
    }

    return { data: template, error: null };
}

/**
 * Apply a template (Restores layout for all floors)
 */
export async function applyTemplate(templateId: string) {
    const supabase = createClient();

    // 1. Get Template Info
    const { data: template } = await supabase
        .from("layout_templates")
        .select("restaurant_id")
        .eq("id", templateId)
        .single();

    if (!template) return { error: "Template not found" };

    // 2. Get Template Items
    const { data: items, error: itemsError } = await supabase
        .from("layout_template_items")
        .select("*")
        .eq("template_id", templateId);

    if (itemsError || !items) return { error: itemsError };

    // 3. Group Items by Floor
    const itemsByFloor: Record<string, any[]> = {};
    items.forEach(item => {
        if (!itemsByFloor[item.floor_id]) itemsByFloor[item.floor_id] = [];
        itemsByFloor[item.floor_id].push(item);
    });

    // 4. Get Floors to Clean/Update
    const { data: floors } = await getFloorsForRestaurant(template.restaurant_id);
    if (!floors) return { error: "No floors found" };

    // 5. Restore each floor
    for (const floor of floors) {
        const floorItems = itemsByFloor[floor.id] || [];

        // Map to format for bulkSave
        const tablesToInsert = floorItems.map(item => ({
            label: item.label,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            shape: item.shape,
            seats: item.seats,
            angle: item.angle
        }));

        // bulkSaveTables handles deletion of previous content
        await bulkSaveTables(floor.id, tablesToInsert);
    }

    return { error: null };
}

/**
 * Update a template metadata (name, description)
 */
export async function updateTemplate(templateId: string, updates: { name?: string; description?: string }) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("layout_templates")
        .update(updates)
        .eq("id", templateId)
        .select()
        .single();

    return { data, error };
}

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
