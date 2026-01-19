"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// NOTE: We use the service role key to bypass RLS and use Admin Auth functions
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function inviteMemberAction(
    email: string,
    roleId: string,
    restaurantId: string,
    displayName: string
) {
    try {
        // 1. Check if user exists in Auth users (not just public.users)
        const { data: existingUsers, error: searchError } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("email", email)
            .limit(1);

        let userId: string;

        if (existingUsers && existingUsers.length > 0) {
            // Case A: User exists
            userId = existingUsers[0].id;
        } else {
            // Case B: User does not exist -> Invite
            const { data: invitation, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`
            });

            if (inviteError) {
                console.error("Supabase Invite Error:", inviteError);
                throw new Error("No se pudo enviar la invitación: " + inviteError.message);
            }

            userId = invitation.user.id;
        }

        // 2. Insert into restaurant_members with display_name
        const { error: memberError } = await supabaseAdmin
            .from("restaurant_members")
            .insert({
                restaurant_id: restaurantId,
                user_id: userId,
                role: roleId,
                display_name: displayName
            });

        if (memberError) {
            if (memberError.code === "23505") {
                return { success: false, message: "El usuario ya es miembro de este restaurante." };
            }
            throw memberError;
        }

        return { success: true, message: "Invitación enviada correctamente." };

    } catch (error: any) {
        console.error("Server Action Error:", error);
        return { success: false, message: error.message || "Error interno del servidor." };
    }
}
