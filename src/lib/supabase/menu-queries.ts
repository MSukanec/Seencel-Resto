import { createClient } from "./client";

export interface MenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
    items?: MenuItem[];
}

export interface MenuItem {
    id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    sort_order: number;
    is_available: boolean;
}

const supabase = createClient();

export async function getMenu(restaurantId: string) {
    const { data, error } = await supabase
        .from("menu_categories")
        .select(`
            *,
            items:menu_items(*)
        `)
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "menu_items", ascending: true });

    return { data: data as MenuCategory[], error };
}

export async function upsertCategory(category: Partial<MenuCategory>) {
    return await supabase.from("menu_categories").upsert(category).select().single();
}

export async function deleteCategory(id: string) {
    return await supabase.from("menu_categories").delete().eq("id", id);
}

export async function upsertMenuItem(item: Partial<MenuItem>) {
    return await supabase.from("menu_items").upsert(item).select().single();
}

export async function deleteMenuItem(id: string) {
    return await supabase.from("menu_items").delete().eq("id", id);
}

export async function updateCategorySort(categories: { id: string, sort_order: number }[]) {
    return await supabase.from("menu_categories").upsert(categories);
}

export async function updateItemSort(items: { id: string, sort_order: number }[]) {
    return await supabase.from("menu_items").upsert(items);
}
