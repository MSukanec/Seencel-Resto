"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Shield, AlertCircle, UserCog, User } from "lucide-react";

interface EditMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    member: {
        user_id: string;
        email: string;
        full_name: string | null;
        display_name: string | null;
        current_role_id: string;
    } | null;
}

interface Role {
    id: string;
    name: string;
    description: string;
    position: number;
}

export function EditMemberModal({ isOpen, onClose, onSuccess, member }: EditMemberModalProps) {
    const [selectedRole, setSelectedRole] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        if (member) {
            setSelectedRole(member.current_role_id);
            setDisplayName(member.display_name || "");
        }
    }, [member]);

    const fetchRoles = async () => {
        const { data } = await supabase.from("roles").select("*").order("position");
        if (data) {
            setRoles(data);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!member) return;

        setLoading(true);
        setError(null);

        try {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const restaurantId = match ? match[2] : null;
            if (!restaurantId) throw new Error("No se seleccionó restaurante");

            const { error: updateError } = await supabase
                .from("restaurant_members")
                .update({
                    role: selectedRole,
                    display_name: displayName.trim() || null
                })
                .eq("restaurant_id", restaurantId)
                .eq("user_id", member.user_id);

            if (updateError) throw updateError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al actualizar miembro");
        } finally {
            setLoading(false);
        }
    };

    if (!member) return null;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Editar Miembro">
            <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                    {/* Email - Read only */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                            <input
                                type="email"
                                value={member.email}
                                disabled
                                className="w-full bg-muted border border-border rounded-xl py-2 pl-10 pr-4 text-muted-foreground cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Display Name - Editable */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nombre para Mostrar</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={member.full_name || "Nombre personalizado"}
                                className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Nombre personalizado para este restaurante. Deja vacío para usar el nombre del usuario.
                        </p>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Rol Asignado</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || !selectedRole}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <UserCog size={16} className="mr-2" />}
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
