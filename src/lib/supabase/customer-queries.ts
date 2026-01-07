import { createClient } from "./client";

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
}

export async function getCustomers(restaurantId: string) {
    const supabase = createClient();
    return await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
}

export async function upsertCustomer(customer: Partial<Customer>) {
    const supabase = createClient();
    return await supabase
        .from("customers")
        .upsert(customer)
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
