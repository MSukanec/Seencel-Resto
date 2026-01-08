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
    latitude?: number;
    longitude?: number;
    google_place_id?: string;
    created_at?: string;
    tags?: Tag[];
    // Helper to map the nested structure from Supabase
    customer_tags?: { guest_attributes: Tag }[];
}

export async function getCustomers(restaurantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("customers")
        .select(`
            *,
            customer_tags (
                guest_attributes (
                    id,
                    name,
                    icon,
                    color
                )
            )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

    if (error) return { data: null, error };

    // Flatten tags for easier consumption
    const customersWithTags = data.map((c: any) => ({
        ...c,
        tags: c.customer_tags?.map((ct: any) => ct.guest_attributes) || []
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

export async function assignCustomerTag(customerId: string, attributeId: string) {
    const supabase = createClient();
    return await supabase
        .from("customer_tags")
        .insert({ customer_id: customerId, attribute_id: attributeId });
}

export async function removeCustomerTag(customerId: string, attributeId: string) {
    const supabase = createClient();
    return await supabase
        .from("customer_tags")
        .delete()
        .match({ customer_id: customerId, attribute_id: attributeId });
}

export async function getRestaurantTags(restaurantId: string) {
    const supabase = createClient();
    return await supabase
        .from("guest_attributes")
        .select("*")
        .or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`)
        .eq("is_active", true)
        .order("name");
}
