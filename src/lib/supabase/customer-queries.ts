import { createClient } from "./client";

export interface Tag {
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

export interface Customer {
    id: string;
    restaurant_id: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    email?: string;
    observations?: string;
    address_raw?: string;
    address_floor?: string;
    address_apartment?: string;
    delivery_notes?: string;
    latitude?: number;
    longitude?: number;
    google_place_id?: string;
    created_at?: string;
    tags?: Tag[];
    // Helper to map the nested structure from Supabase
    customer_tags?: { customer_attributes: Tag }[];
}

export async function getCustomers(restaurantId: string) {
    const supabase = createClient();

    // Try with nested join for tags via customer_tags -> tags
    const { data, error } = await supabase
        .from("customers")
        .select(`
            *,
            customer_tags (
                tag_id,
                tags:tag_id (
                    id,
                    name,
                    icon,
                    color
                )
            )
        `)
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    // If nested query fails, fallback to basic query without tags
    if (error) {
        console.warn("Nested query failed, falling back to basic customer query:", error.message);
        const { data: basicData, error: basicError } = await supabase
            .from("customers")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (basicError) return { data: null, error: basicError };

        // Return customers without tags
        const customersWithoutTags = (basicData || []).map((c: any) => ({
            ...c,
            tags: []
        }));
        return { data: customersWithoutTags, error: null };
    }

    // Flatten tags for easier consumption
    const customersWithTags = data.map((c: any) => ({
        ...c,
        tags: c.customer_tags?.map((ct: any) => ct.tags).filter(Boolean) || []
    }));

    return { data: customersWithTags, error: null };
}

export async function upsertCustomer(customer: Partial<Customer>) {
    // Remove tags/customer_tags from the payload to avoid DB errors
    const { tags, customer_tags, ...dbCustomer } = customer;

    const supabase = createClient();
    return await supabase
        .from("customers")
        .upsert(dbCustomer)
        .select()
        .single();
}

export async function deleteCustomer(id: string) {
    const supabase = createClient();
    return await supabase
        .from("customers")
        .delete()
        .eq("id", id);
}

export async function assignCustomerTag(customerId: string, tagId: string) {
    const supabase = createClient();
    return await supabase
        .from("customer_tags")
        .insert({ customer_id: customerId, tag_id: tagId });
}

export async function removeCustomerTag(customerId: string, tagId: string) {
    const supabase = createClient();
    return await supabase
        .from("customer_tags")
        .delete()
        .match({ customer_id: customerId, tag_id: tagId });
}

export async function getRestaurantTags(restaurantId: string) {
    const supabase = createClient();
    // Use tags table, filter for tags that apply to customers
    const { data, error } = await supabase
        .from("tags")
        .select("*")
        .or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`)
        .contains("applies_to", ["customer"])
        .order("name");

    return { data, error };
}
