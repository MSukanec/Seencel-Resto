import { createClient } from "./client";

export interface KitchenSector {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    position: number;
    is_active: boolean;
}

export interface KitchenSectorInsert {
    restaurant_id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    position?: number;
}

// ============ QUERIES ============

export async function getSectors(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("kitchen_sectors")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("position", { ascending: true });

    return { data: data as KitchenSector[], error };
}

export async function getAllSectors(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("kitchen_sectors")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("position", { ascending: true });

    return { data: data as KitchenSector[], error };
}

// ============ MUTATIONS ============

export async function createSector(data: KitchenSectorInsert) {
    const supabase = createClient();

    // Get max position for this restaurant
    const { data: existing } = await supabase
        .from("kitchen_sectors")
        .select("position")
        .eq("restaurant_id", data.restaurant_id)
        .order("position", { ascending: false })
        .limit(1);

    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const { data: created, error } = await supabase
        .from("kitchen_sectors")
        .insert({
            ...data,
            position: data.position ?? nextPosition,
            color: data.color ?? "#10b981",
            icon: data.icon ?? "chef-hat"
        })
        .select()
        .single();

    return { data: created as KitchenSector, error };
}

export async function updateSector(id: string, data: Partial<KitchenSector>) {
    const supabase = createClient();
    const { data: updated, error } = await supabase
        .from("kitchen_sectors")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    return { data: updated as KitchenSector, error };
}

export async function deleteSector(id: string) {
    const supabase = createClient();
    // Soft delete
    return await supabase
        .from("kitchen_sectors")
        .update({ is_active: false })
        .eq("id", id);
}

export async function updateSectorPositions(sectors: { id: string; position: number }[]) {
    const supabase = createClient();
    const promises = sectors.map((s) =>
        supabase.from("kitchen_sectors").update({ position: s.position }).eq("id", s.id)
    );
    const results = await Promise.all(promises);
    const error = results.find((r) => r.error)?.error;
    return { error };
}
