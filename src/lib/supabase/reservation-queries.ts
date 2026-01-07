"use server";

import { createClient } from "@/lib/supabase/server";

export interface OperatingSchedule {
    id: string;
    restaurant_id: string;
    day_of_week: number; // 0-6
    open_time: string; // HH:MM:SS
    close_time: string; // HH:MM:SS
    is_closed: boolean;
}

export interface DayConfiguration {
    id: string;
    restaurant_id: string;
    date: string; // YYYY-MM-DD
    is_special_event: boolean;
    event_name: string | null;
    custom_time_slots: string[] | null; // e.g. ["20:00", "22:00"]
    is_closed: boolean;
}

// --- Operating Schedules ---

export async function getOperatingSchedules(restaurantId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("operating_schedules")
        .select("*")
        .eq("restaurant_id", restaurantId);
    return { data: data as OperatingSchedule[] | null, error };
}

export async function upsertOperatingSchedule(schedule: Partial<OperatingSchedule> & { restaurant_id: string, day_of_week: number }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("operating_schedules")
        .upsert(schedule, { onConflict: 'restaurant_id,day_of_week' })
        .select()
        .single();
    return { data, error };
}

export async function upsertOperatingSchedules(schedules: (Partial<OperatingSchedule> & { restaurant_id: string, day_of_week: number })[]) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("operating_schedules")
        .upsert(schedules, { onConflict: 'restaurant_id,day_of_week' })
        .select();
    return { data, error };
}

// --- Day Configurations ---

export async function getDayConfiguration(restaurantId: string, date: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("day_configurations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("date", date)
        .single();
    return { data: data as DayConfiguration | null, error };
}

export async function getMonthConfigurations(restaurantId: string, startDate: string, endDate: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("day_configurations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", startDate)
        .lte("date", endDate);
    return { data: data as DayConfiguration[] | null, error };
}

export async function upsertDayConfiguration(config: Partial<DayConfiguration> & { restaurant_id: string, date: string }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("day_configurations")
        .upsert(config, { onConflict: 'restaurant_id,date' })
        .select()
        .single();
    return { data, error };
}

export async function deleteDayConfiguration(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("day_configurations")
        .delete()
        .eq("id", id);
    return { error };
}
