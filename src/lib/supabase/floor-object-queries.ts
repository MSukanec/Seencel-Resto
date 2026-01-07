import { createClient } from "@/lib/supabase/client";

export interface FloorObject {
    id: string;
    floor_id: string;
    type: "wall" | "door" | "window" | "pillar";
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    properties: Record<string, any>;
    created_at: string;
}

export interface FloorObjectInsert {
    floor_id: string;
    type: "wall" | "door" | "window" | "pillar";
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    properties?: Record<string, any>;
}

/**
 * Get all floor objects for a specific floor
 */
export async function getFloorObjects(floorId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floor_objects")
        .select("*")
        .eq("floor_id", floorId);

    if (error) {
        console.error("Error fetching floor objects:", error);
        return { data: null, error };
    }

    return { data: data as FloorObject[], error: null };
}

/**
 * Create a single floor object
 */
export async function saveFloorObject(object: FloorObjectInsert) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floor_objects")
        .insert({
            ...object,
            properties: object.properties || {},
        })
        .select()
        .single();

    if (error) {
        console.error("Error saving floor object:", error);
        return { data: null, error };
    }

    return { data: data as FloorObject, error: null };
}

/**
 * Update a floor object
 */
export async function updateFloorObject(objectId: string, updates: Partial<FloorObjectInsert>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("floor_objects")
        .update(updates)
        .eq("id", objectId)
        .select()
        .single();

    if (error) {
        console.error("Error updating floor object:", error);
        return { data: null, error };
    }

    return { data: data as FloorObject, error: null };
}

/**
 * Delete a floor object
 */
export async function deleteFloorObject(objectId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from("floor_objects")
        .delete()
        .eq("id", objectId);

    if (error) {
        console.error("Error deleting floor object:", error);
        return { error };
    }

    return { error: null };
}

/**
 * Bulk save floor objects (replaces all objects for a floor)
 */
export async function bulkSaveFloorObjects(floorId: string, objects: Omit<FloorObjectInsert, "floor_id">[]) {
    const supabase = createClient();

    // Delete existing objects
    await supabase
        .from("floor_objects")
        .delete()
        .eq("floor_id", floorId);

    // Insert new objects
    if (objects.length === 0) {
        return { data: [], error: null };
    }

    const objectsWithFloorId = objects.map(obj => ({
        ...obj,
        floor_id: floorId,
        properties: obj.properties || {},
    }));

    const { data, error } = await supabase
        .from("floor_objects")
        .insert(objectsWithFloorId)
        .select();

    if (error) {
        console.error("Error bulk saving floor objects:", error);
        return { data: null, error };
    }

    return { data: data as FloorObject[], error: null };
}
