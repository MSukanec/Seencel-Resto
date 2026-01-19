import { createClient } from "@/lib/supabase/client";

export interface Menu {
    id: string;
    restaurant_id: string;
    name: string;
    description?: string;
    is_default: boolean;
    is_active: boolean;
    color?: string;
    icon?: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface MenuMenuItem {
    menu_id: string;
    menu_item_id: string;
    sort_order: number;
    price_override?: number;
    is_available: boolean;
}

// ============ MENU CRUD ============

export async function getMenus(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return { data: data as Menu[], error };
}

export async function getDefaultMenu(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_default", true)
        .single();

    return { data: data as Menu, error };
}

export async function upsertMenu(menu: Partial<Menu> & { restaurant_id: string }) {
    const supabase = createClient();

    // If setting as default, unset other defaults first
    if (menu.is_default && menu.restaurant_id) {
        await supabase
            .from("menus")
            .update({ is_default: false })
            .eq("restaurant_id", menu.restaurant_id);
    }

    const { data, error } = await supabase
        .from("menus")
        .upsert(menu)
        .select()
        .single();

    return { data: data as Menu, error };
}

export async function deleteMenu(menuId: string) {
    const supabase = createClient();
    // Soft delete by setting is_active to false
    const { error } = await supabase
        .from("menus")
        .update({ is_active: false })
        .eq("id", menuId);

    return { error };
}

// ============ MENU-ITEM RELATIONSHIPS ============

export async function getMenuItems(menuId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("menu_menu_items")
        .select(`
            *,
            menu_item:menu_items(*, sector:kitchen_sectors(*), menu_item_tags(tag:tags(*)))
        `)
        .eq("menu_id", menuId)
        .order("sort_order", { ascending: true });

    return { data, error };
}

export async function addItemToMenu(menuId: string, menuItemId: string, sortOrder: number = 0) {
    const supabase = createClient();
    const { error } = await supabase
        .from("menu_menu_items")
        .insert({
            menu_id: menuId,
            menu_item_id: menuItemId,
            sort_order: sortOrder,
            is_available: true
        });

    return { error };
}

export async function removeItemFromMenu(menuId: string, menuItemId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from("menu_menu_items")
        .delete()
        .match({ menu_id: menuId, menu_item_id: menuItemId });

    return { error };
}

export async function updateMenuItemOverride(
    menuId: string,
    menuItemId: string,
    updates: { price_override?: number; is_available?: boolean }
) {
    const supabase = createClient();
    const { error } = await supabase
        .from("menu_menu_items")
        .update(updates)
        .match({ menu_id: menuId, menu_item_id: menuItemId });

    return { error };
}

export async function syncMenuItems(menuId: string, menuItemIds: string[]) {
    const supabase = createClient();

    // Delete all existing
    await supabase.from("menu_menu_items").delete().eq("menu_id", menuId);

    // Insert new
    if (menuItemIds.length > 0) {
        const inserts = menuItemIds.map((itemId, index) => ({
            menu_id: menuId,
            menu_item_id: itemId,
            sort_order: index,
            is_available: true
        }));
        return await supabase.from("menu_menu_items").insert(inserts);
    }

    return { error: null };
}

// ============ BULK OPERATIONS ============

export async function assignAllItemsToMenu(menuId: string, restaurantId: string) {
    const supabase = createClient();

    // Get all menu items for this restaurant
    const { data: categories } = await supabase
        .from("menu_categories")
        .select("id")
        .eq("restaurant_id", restaurantId);

    if (!categories) return { error: new Error("No categories found") };

    const categoryIds = categories.map(c => c.id);

    const { data: items } = await supabase
        .from("menu_items")
        .select("id")
        .in("category_id", categoryIds);

    if (!items) return { error: new Error("No items found") };

    // Sync all items to this menu
    return await syncMenuItems(menuId, items.map(i => i.id));
}

export async function duplicateMenu(sourceMenuId: string, newName: string, restaurantId: string) {
    const supabase = createClient();

    // Get source menu
    const { data: sourceMenu } = await supabase
        .from("menus")
        .select("*")
        .eq("id", sourceMenuId)
        .single();

    if (!sourceMenu) return { error: new Error("Source menu not found") };

    // Create new menu
    const { data: newMenu, error: createError } = await supabase
        .from("menus")
        .insert({
            restaurant_id: restaurantId,
            name: newName,
            description: sourceMenu.description,
            is_default: false,
            is_active: true,
            color: sourceMenu.color,
            icon: sourceMenu.icon,
            sort_order: sourceMenu.sort_order + 1
        })
        .select()
        .single();

    if (createError || !newMenu) return { error: createError };

    // Copy all items
    const { data: sourceItems } = await supabase
        .from("menu_menu_items")
        .select("*")
        .eq("menu_id", sourceMenuId);

    if (sourceItems && sourceItems.length > 0) {
        const newItems = sourceItems.map(item => ({
            menu_id: newMenu.id,
            menu_item_id: item.menu_item_id,
            sort_order: item.sort_order,
            price_override: item.price_override,
            is_available: item.is_available
        }));
        await supabase.from("menu_menu_items").insert(newItems);
    }

    return { data: newMenu as Menu, error: null };
}
