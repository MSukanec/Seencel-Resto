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
