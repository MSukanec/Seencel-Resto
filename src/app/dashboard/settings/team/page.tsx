"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Shield, User, Mail, UserPlus, Users, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { InviteMemberModal } from "@/components/team/invite-member-modal";
import { EditMemberModal } from "@/components/team/edit-member-modal";
import { deleteMember } from "@/lib/supabase/team-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/ui/confirm-modal";

interface Member {
    user_id: string;
    joined_at: string;
    role: string;
    display_name: string | null;
    user: {
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
    role_data: {
        id: string;
        name: string;
        description: string;
        position: number;
        color: string | null;
    };
}

interface RoleGroup {
    role_id: string;
    role_name: string;
    role_position: number;
    role_color: string | null;
    members: Member[];
}

// Role priority order (lower = higher priority)
const ROLE_ORDER = ["owner", "manager", "chef", "bartender", "waiter", "delivery"];

export default function TeamPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingMember, setEditingMember] = useState<{
        user_id: string;
        email: string;
        full_name: string | null;
        display_name: string | null;
        current_role_id: string;
    } | null>(null);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const confirm = useConfirm();

    useEffect(() => {
        fetchMembers();
    }, []);

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setOpenPopover(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        const restaurantId = match ? match[2] : null;

        if (!restaurantId) return;

        const { data, error } = await supabase
            .from("restaurant_members")
            .select(`
                user_id,
                joined_at,
                role,
                display_name,
                user:users (email, full_name, avatar_url),
                role_data:roles (id, name, description, position, color)
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

    const handleEditSuccess = () => {
        fetchMembers();
        setEditingMember(null);
    };

    const handleDelete = async (member: Member) => {
        const confirmed = await confirm({
            title: "Eliminar Miembro",
            message: `¿Estás seguro de eliminar a ${member.user.full_name || member.user.email} del equipo?`,
            variant: "danger"
        });

        if (!confirmed) return;

        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        const restaurantId = match ? match[2] : null;

        if (!restaurantId) return;

        const { error } = await deleteMember(restaurantId, member.user_id);
        if (error) {
            console.error("Error deleting member:", error);
        } else {
            fetchMembers();
        }
    };

    // Group members by role, sorted by role position, then members alphabetically (nulls last)
    const groupedByRole = (): RoleGroup[] => {
        const groups: Record<string, RoleGroup> = {};

        for (const member of members) {
            const roleId = member.role_data?.id || member.role;
            if (!groups[roleId]) {
                groups[roleId] = {
                    role_id: roleId,
                    role_name: member.role_data?.name || "Sin rol",
                    role_position: member.role_data?.position ?? 999,
                    role_color: member.role_data?.color || null,
                    members: []
                };
            }
            groups[roleId].members.push(member);
        }

        // Sort groups by role position, then sort members within each group
        return Object.values(groups)
            .sort((a, b) => a.role_position - b.role_position)
            .map(group => ({
                ...group,
                members: group.members.sort((a, b) => {
                    const nameA = a.display_name || a.user.full_name;
                    const nameB = b.display_name || b.user.full_name;

                    // Nulls go last
                    if (!nameA && !nameB) return 0;
                    if (!nameA) return 1;
                    if (!nameB) return -1;

                    return nameA.localeCompare(nameB, 'es');
                })
            }));
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-muted/30">
                <PageHeader
                    icon={Users}
                    title="Equipo"
                    subtitle="Cargando..."
                />
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </div>
        );
    }

    const roleGroups = groupedByRole();

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Users}
                title="Equipo"
                subtitle={`${members.length} miembro${members.length !== 1 ? 's' : ''} en el staff`}
                actions={
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <UserPlus size={18} />
                        <span className="hidden md:inline">Invitar Miembro</span>
                    </button>
                }
            />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    {roleGroups.map((group) => (
                        <div key={group.role_id}>
                            {/* Role Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <Shield
                                    size={16}
                                    className="text-muted-foreground"
                                    style={group.role_color ? { color: group.role_color } : undefined}
                                />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    {group.role_name}
                                </h2>
                                <span className="text-xs text-muted-foreground/60">
                                    ({group.members.length})
                                </span>
                            </div>

                            {/* Members in this role */}
                            <div className="space-y-2">
                                {group.members.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:border-primary/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            {member.user.avatar_url ? (
                                                <img
                                                    src={member.user.avatar_url}
                                                    alt={member.display_name || member.user.full_name || member.user.email}
                                                    className="h-11 w-11 rounded-full object-cover ring-2 ring-border shrink-0"
                                                />
                                            ) : (
                                                <div
                                                    className="h-11 w-11 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
                                                    style={{
                                                        backgroundColor: group.role_color || '#f97316'
                                                    }}
                                                >
                                                    {(member.display_name || member.user.full_name)
                                                        ? (member.display_name || member.user.full_name)![0].toUpperCase()
                                                        : (member.user.email ? member.user.email[0].toUpperCase() : <User size={20} />)
                                                    }
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-semibold text-foreground">
                                                    {member.display_name || member.user.full_name || "Sin nombre"}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail size={14} />
                                                    {member.user.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Popover */}
                                        <div className="relative" ref={openPopover === member.user_id ? popoverRef : null}>
                                            <button
                                                onClick={() => setOpenPopover(openPopover === member.user_id ? null : member.user_id)}
                                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {openPopover === member.user_id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                    <button
                                                        onClick={() => {
                                                            setOpenPopover(null);
                                                            setEditingMember({
                                                                user_id: member.user_id,
                                                                email: member.user.email,
                                                                full_name: member.user.full_name,
                                                                display_name: member.display_name,
                                                                current_role_id: member.role
                                                            });
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                                                    >
                                                        <Pencil size={16} />
                                                        Editar Rol
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setOpenPopover(null);
                                                            handleDelete(member);
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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

                <EditMemberModal
                    isOpen={!!editingMember}
                    onClose={() => setEditingMember(null)}
                    onSuccess={handleEditSuccess}
                    member={editingMember}
                />
            </div>
        </div>
    );
}
