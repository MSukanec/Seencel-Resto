"use server";

import { createClient } from "@/lib/supabase/server";

export interface RestaurantSettings {
    id: string;
    restaurant_id: string;
    chair_spacing_cm: number;
    default_table_size_cm: number;
    created_at: string;
    updated_at: string;
}

export async function getRestaurantSettings(restaurantId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .single();

    return { data: data as RestaurantSettings | null, error };
}

export async function updateRestaurantSettings(
    restaurantId: string,
    settings: Partial<Pick<RestaurantSettings, 'chair_spacing_cm' | 'default_table_size_cm'>>
) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("restaurant_settings")
        .update({
            ...settings,
            updated_at: new Date().toISOString()
        })
        .eq("restaurant_id", restaurantId)
        .select()
        .single();

    return { data: data as RestaurantSettings | null, error };
}
