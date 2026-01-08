"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Shield, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { inviteMemberAction } from "@/app/actions/team-actions";

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Role {
    id: string;
    name: string;
    description: string;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
    const [email, setEmail] = useState("");
    const [selectedRole, setSelectedRole] = useState("");
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        const { data } = await supabase.from("roles").select("*").order("name");
        if (data) {
            setRoles(data);
            if (data.length > 0) setSelectedRole(data[0].id);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Get current restaurant ID
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const restaurantId = match ? match[2] : null;
            if (!restaurantId) throw new Error("No se seleccionó restaurante");

            // 2. Call Server Action
            const result = await inviteMemberAction(email, selectedRole, restaurantId);

            if (!result.success) {
                throw new Error(result.message);
            }

            onSuccess();
            setEmail("");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al invitar miembro");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Invitar Nuevo Miembro">
            <form onSubmit={handleInvite} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@ejemplo.com"
                                className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">El usuario debe estar registrado en Seencel.</p>
                    </div>

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
                    <Button type="submit" disabled={loading || !email || !selectedRole}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} className="mr-2" />}
                        {loading ? "Invitando..." : "Enviar Invitación"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
