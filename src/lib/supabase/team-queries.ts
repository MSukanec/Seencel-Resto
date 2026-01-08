"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteMember(restaurantId: string, userId: string) {
    const supabase = await createClient();

    // Check permissions? RLS handles this mostly, but good to be safe.
    // For now assuming RLS policies on 'restaurant_members' restrict default users from deleting others 
    // unless they are owners/admins.

    const { error } = await supabase
        .from("restaurant_members")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("user_id", userId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/settings/team");
    return { error: null };
}
