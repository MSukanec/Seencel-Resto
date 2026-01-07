"use server";

import { createClient } from "@/lib/supabase/server";

export interface RestaurantSettings {
    id: string;
    restaurant_id: string;
    chair_spacing_cm: number;
    default_table_size_cm: number;
    reservation_interval_minutes: number;
    min_reservation_time_hours: number;
    max_reservation_time_days: number;
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
    settings: Partial<Pick<RestaurantSettings, 'chair_spacing_cm' | 'default_table_size_cm' | 'reservation_interval_minutes' | 'min_reservation_time_hours' | 'max_reservation_time_days'>>
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
