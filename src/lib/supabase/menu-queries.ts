import { createClient } from "./client";
import type { KitchenSector } from "./sector-queries";

export interface MenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    sort_order: number;
    is_active: boolean;
    items?: MenuItem[];
}

export interface MenuVariant {
    name: string;      // e.g., "8 unidades", "Porción grande"
    price: number;     // Price for this variant
}

export interface MenuItemTag {
    id: string;
    name: string;
    color: string;
    icon?: string;
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
    is_featured?: boolean;
    variants?: MenuVariant[];
    code?: string;  // Internal restaurant code for the item
    sector_id?: string;
    sector?: KitchenSector;
    tags?: MenuItemTag[];
    recipe?: string;  // Rich text HTML recipe content
}

export interface MenuItemInsert {
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    sort_order?: number;
    is_available?: boolean;
    is_featured?: boolean;
    variants?: MenuVariant[];
    code?: string;  // Internal restaurant code for the item
    sector_id?: string;
}

export async function getMenu(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("menu_categories")
        .select(`
            *,
            items:menu_items(*, sector:kitchen_sectors(*), menu_item_tags(tag:tags(*)))
        `)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("sort_order", { foreignTable: "menu_items", ascending: true });

    // Transform tags from nested structure to flat array
    if (data) {
        data.forEach(cat => {
            if (cat.items) {
                cat.items = cat.items.map((item: any) => ({
                    ...item,
                    tags: item.menu_item_tags?.map((mit: any) => mit.tag).filter(Boolean) || []
                }));
            }
        });
    }

    return { data: data as MenuCategory[], error };
}

export async function getMenuCategories(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return { data: data as MenuCategory[], error };
}

export async function createMenuCategory(restaurantId: string, name: string, description?: string) {
    const supabase = createClient();

    // Get max sort_order for this restaurant
    const { data: existing } = await supabase
        .from("menu_categories")
        .select("sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    const { data, error } = await supabase
        .from("menu_categories")
        .insert({
            restaurant_id: restaurantId,
            name,
            description,
            sort_order: nextOrder
        })
        .select()
        .single();

    return { data: data as MenuCategory, error };
}

export async function upsertCategory(category: Partial<MenuCategory>) {
    const supabase = createClient();
    return await supabase.from("menu_categories").upsert(category).select().single();
}

export async function deleteCategory(id: string) {
    const supabase = createClient();
    // Soft delete - set is_active to false
    return await supabase.from("menu_categories").update({ is_active: false }).eq("id", id);
}

export async function upsertMenuItem(item: Partial<MenuItem>) {
    const supabase = createClient();
    // Remove relation objects that shouldn't be sent to DB
    const { sector, ...dbItem } = item as any;
    return await supabase.from("menu_items").upsert(dbItem).select().single();
}

export async function deleteMenuItem(id: string) {
    const supabase = createClient();
    // Hard delete - actually remove the item
    return await supabase.from("menu_items").delete().eq("id", id);
}

export async function updateCategorySort(categories: { id: string, sort_order: number }[]) {
    const supabase = createClient();
    // Use individual updates instead of upsert to avoid needing all required fields
    const promises = categories.map(cat =>
        supabase.from("menu_categories").update({ sort_order: cat.sort_order }).eq("id", cat.id)
    );
    const results = await Promise.all(promises);
    const error = results.find(r => r.error)?.error;
    return { error };
}

export async function updateItemSort(items: { id: string, sort_order: number }[]) {
    const supabase = createClient();
    // Use individual updates instead of upsert to avoid needing all required fields
    const promises = items.map(item =>
        supabase.from("menu_items").update({ sort_order: item.sort_order }).eq("id", item.id)
    );
    const results = await Promise.all(promises);
    const error = results.find(r => r.error)?.error;
    return { error };
}

// Bulk update sector for all items in a category
export async function bulkUpdateCategorySector(categoryId: string, sectorId: string | null) {
    const supabase = createClient();
    const { error } = await supabase
        .from("menu_items")
        .update({ sector_id: sectorId })
        .eq("category_id", categoryId);
    return { error };
}

// ============ BULK IMPORT ============

export async function bulkInsertMenuItems(items: MenuItemInsert[]) {
    if (items.length === 0) return { data: [], error: null };

    const supabase = createClient();

    // Get max sort_order for the category
    const categoryId = items[0].category_id;
    const { data: existing } = await supabase
        .from("menu_items")
        .select("sort_order")
        .eq("category_id", categoryId)
        .order("sort_order", { ascending: false })
        .limit(1);

    let nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

    // Assign sort_order to items
    const itemsWithOrder = items.map((item, idx) => ({
        ...item,
        sort_order: item.sort_order ?? (nextOrder + idx),
        is_available: item.is_available ?? true,
        is_featured: item.is_featured ?? false,
        price: item.price ?? 0
    }));

    const { data, error } = await supabase
        .from("menu_items")
        .insert(itemsWithOrder)
        .select();

    return { data: data as MenuItem[], error };
}

// ============ IMPORT PARSING HELPERS ============

export interface ParsedMenuItem {
    name: string;
    description?: string;
    price: number;
    variants?: MenuVariant[];
    code?: string;       // Internal restaurant code
    categoryName?: string; // Category name from import (for auto-creation)
    errors: string[];
    rowIndex: number;
}

/**
 * Parse raw data rows into menu items
 */
export function parseMenuData(
    rows: Record<string, string>[],
    mapping: { name: string; description?: string; price: string; variants?: string; code?: string; category?: string }
): ParsedMenuItem[] {
    return rows.map((row, idx) => {
        const errors: string[] = [];

        // Name
        const name = row[mapping.name]?.trim() || "";
        if (!name) {
            errors.push("Nombre vacío");
        }

        // Description
        const description = mapping.description ? row[mapping.description]?.trim() : undefined;

        // Price
        let price = 0;
        const priceRaw = row[mapping.price]?.toString().trim() || "0";
        const priceClean = priceRaw.replace(/[^\d.,]/g, "").replace(",", ".");
        price = parseFloat(priceClean) || 0;

        if (price < 0) {
            errors.push("Precio negativo");
        }

        // Variants (optional)
        let variants: MenuVariant[] | undefined;
        if (mapping.variants && row[mapping.variants]) {
            const variantsRaw = row[mapping.variants].trim();
            if (variantsRaw) {
                variants = parseVariants(variantsRaw);
            }
        }

        // Code
        const code = mapping.code ? row[mapping.code]?.trim() : undefined;

        // Category name
        const categoryName = mapping.category ? row[mapping.category]?.trim() : undefined;

        return {
            name,
            description,
            price,
            variants: variants && variants.length > 0 ? variants : undefined,
            code: code || undefined,
            categoryName: categoryName || undefined,
            errors,
            rowIndex: idx
        };
    });
}

/**
 * Parse variants string like "8u:20500,4u:11000"
 */
export function parseVariants(variantsStr: string): MenuVariant[] {
    const variants: MenuVariant[] = [];
    const parts = variantsStr.split(",");

    for (const part of parts) {
        const [name, priceStr] = part.split(":").map(s => s.trim());
        if (name && priceStr) {
            const price = parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            if (price > 0) {
                variants.push({ name, price });
            }
        }
    }

    return variants;
}

// ============ MENU ITEM TAGS ============

export async function getMenuItemTags(restaurantId: string) {
    const supabase = createClient();
    // Get tags that apply to menu_item
    const { data, error } = await supabase
        .from("tags")
        .select("*")
        .or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`)
        .contains("applies_to", ["menu_item"])
        .order("name");

    return { data, error };
}

export async function addMenuItemTag(menuItemId: string, tagId: string) {
    const supabase = createClient();
    return await supabase
        .from("menu_item_tags")
        .insert({ menu_item_id: menuItemId, tag_id: tagId });
}

export async function removeMenuItemTag(menuItemId: string, tagId: string) {
    const supabase = createClient();
    return await supabase
        .from("menu_item_tags")
        .delete()
        .match({ menu_item_id: menuItemId, tag_id: tagId });
}

export async function syncMenuItemTags(menuItemId: string, tagIds: string[]) {
    const supabase = createClient();

    // Delete all existing tags for this item
    await supabase.from("menu_item_tags").delete().eq("menu_item_id", menuItemId);

    // Insert new tags
    if (tagIds.length > 0) {
        const inserts = tagIds.map(tagId => ({ menu_item_id: menuItemId, tag_id: tagId }));
        return await supabase.from("menu_item_tags").insert(inserts);
    }

    return { error: null };
}
