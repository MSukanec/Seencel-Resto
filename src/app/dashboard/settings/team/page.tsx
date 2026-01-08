"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Search, Shield, Trash2, User, Mail, UserPlus, Settings } from "lucide-react";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { Button } from "@/components/ui/button";
import { deleteMember } from "@/lib/supabase/team-queries";

interface Member {
    user_id: string;
    joined_at: string;
    role: string; // uuid
    user: {
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
    role_data: {
        name: string;
        description: string;
    };
}

export default function TeamPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        // Get current restaurant ID from cookie or context
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        const restaurantId = match ? match[2] : null;

        if (!restaurantId) return;

        const { data, error } = await supabase
            .from("restaurant_members")
            .select(`
                user_id,
                joined_at,
                role,
                user:users (email, full_name, avatar_url),
                role_data:roles (name, description)
            `)
            .eq("restaurant_id", restaurantId);

        if (error) {
            console.error("Error fetching members:", error);
        } else {
            setMembers(data as any);
        }
        setLoading(false);
    };

    const handleInviteSuccess = () => {
        fetchMembers();
        setShowInviteModal(false);
    };

    const handleDelete = async (userId: string) => {
        // optimistically update or loading?
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        const restaurantId = match ? match[2] : null;

        if (!restaurantId) return;

        const { error } = await deleteMember(restaurantId, userId);
        if (error) {
            alert("Error al eliminar miembro: " + error);
        } else {
            // refresh
            fetchMembers();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Equipo</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona los miembros de tu staff y sus permisos.
                    </p>
                </div>
                <Button onClick={() => setShowInviteModal(true)} className="gap-2">
                    <UserPlus size={18} />
                    Invitar Miembro
                </Button>
            </header>

            <div className="grid gap-4">
                {members.map((member) => (
                    <div
                        key={member.user_id}
                        className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:border-primary/20 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                                {member.user.full_name ? member.user.full_name[0].toUpperCase() : (member.user.email ? member.user.email[0].toUpperCase() : <User />)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {member.user.full_name || "Sin nombre"}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail size={14} />
                                    {member.user.email}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                    <Shield size={12} />
                                    {member.role_data?.name || "Rol desconocido"}
                                </span>

                                <button
                                    onClick={() => {
                                        if (confirm(`¿Estás seguro de eliminar a ${member.user.full_name || member.user.email} del equipo?`)) {
                                            handleDelete(member.user_id);
                                        }
                                    }}
                                    className="text-xs text-destructive hover:underline flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={12} />
                                    Eliminar
                                </button>
                            </div>

                        </div>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                        No hay miembros en el equipo aún.
                    </div>
                )}
            </div>

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={handleInviteSuccess}
            />
        </div>
    );
}
