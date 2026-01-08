"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface OpenTableSessionParams {
    tableId: string;
    restaurantId: string;
    customerId?: string | null;
    pax: number;
}

export async function openTableSession({ tableId, restaurantId, customerId, pax }: OpenTableSessionParams) {
    const supabase = await createClient();

    // 1. Create a new Session Record (History)
    const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            customer_id: customerId,
            pax: pax,
            status: "open",
            opened_at: new Date().toISOString()
        })
        .select()
        .single();

    if (sessionError) {
        console.error("Error creating session:", sessionError);
        return { error: sessionError.message };
    }

    // 2. Update Table Status (Current State)
    const { error: tableError } = await supabase
        .from("tables")
        .update({
            status: "occupied",
            current_pax: pax,
            customer_id: customerId,
            current_session_id: session.id, // Link to the history record
            opened_at: new Date().toISOString()
        })
        .eq("id", tableId);

    if (tableError) {
        console.error("Error updating table status:", tableError);
        // Optional: Rollback session if table update fails? 
        // For MVP we just return error, but ideally we'd transaction this.
        return { error: tableError.message };
    }

    revalidatePath("/dashboard");
    return { data: session };
}

export async function closeTableSession(tableId: string) {
    const supabase = await createClient();

    // 1. Get Table to find current_session_id
    const { data: table, error: tableFetchError } = await supabase
        .from("tables")
        .select("current_session_id")
        .eq("id", tableId)
        .single();

    if (tableFetchError) return { error: tableFetchError.message };

    // 2. Close Session Record
    if (table?.current_session_id) {
        const { error: sessionError } = await supabase
            .from("sessions")
            .update({
                status: "closed",
                closed_at: new Date().toISOString()
            })
            .eq("id", table?.current_session_id);

        if (sessionError) console.error("Error closing session:", sessionError);
    }

    // 3. Free Table
    const { error: tableError } = await supabase
        .from("tables")
        .update({
            status: "available",
            current_pax: null,
            customer_id: null,
            current_session_id: null,
            opened_at: null
        })
        .eq("id", tableId);

    if (tableError) return { error: tableError.message };

    revalidatePath("/dashboard");
    return { success: true };
}
