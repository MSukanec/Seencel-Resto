import { createClient } from "@/lib/supabase/client";

export interface Floor {
    id: string;
    restaurant_id: string;
    name: string;
    width: number;
    height: number;
    created_at: string;
    updated_at: string;
}

export interface FloorInsert {
    restaurant_id: string;
    name: string;
    width?: number;
    height?: number;
}

/**
 * Get all floors for a restaurant
 */
export async function getFloorsForRestaurant(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floors")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching floors:", error);
        return { data: null, error };
    }

    return { data: data as Floor[], error: null };
}

/**
 * Get a single floor by ID
 */
export async function getFloorById(floorId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floors")
        .select("*")
        .eq("id", floorId)
        .single();

    if (error) {
        console.error("Error fetching floor:", error);
        return { data: null, error };
    }

    return { data: data as Floor, error: null };
}

/**
 * Create a new floor
 */
export async function createFloor(floor: FloorInsert) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floors")
        .insert({
            ...floor,
            // Removed hardcoded width/height defaults as they are not used in infinite canvas
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating floor:", error);
        return { data: null, error };
    }

    return { data: data as Floor, error: null };
}

/**
 * Update a floor
 */
export async function updateFloor(floorId: string, updates: Partial<FloorInsert>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floors")
        .update(updates)
        .eq("id", floorId)
        .select()
        .single();

    if (error) {
        console.error("Error updating floor:", error);
        return { data: null, error };
    }

    return { data: data as Floor, error: null };
}

/**
 * Delete a floor (cascades to floor_objects and tables)
 */
export async function deleteFloor(floorId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from("floors")
        .delete()
        .eq("id", floorId);

    if (error) {
        console.error("Error deleting floor:", error);
        return { error };
    }

    return { error: null };
}

/**
 * Get or create default floor for a restaurant
 */
// getOrCreateDefaultFloor removed per user request (no auto-creation)
