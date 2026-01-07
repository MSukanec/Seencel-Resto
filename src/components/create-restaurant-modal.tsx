"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CreateRestaurantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (newRestaurant: any) => void;
}

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreateRestaurantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (newRestaurant: any) => void;
}

export function CreateRestaurantModal({ isOpen, onClose, onCreated }: CreateRestaurantModalProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // Generate slug: name-random
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

            // Call the RPC function 'create_restaurant'
            const { data, error: insertError } = await supabase
                .rpc('create_restaurant', {
                    p_name: name.trim(),
                    p_slug: slug,
                    p_address: null
                });

            if (insertError) throw insertError;

            // Success
            onCreated(data);
            setName("");
            onClose();

        } catch (err: any) {
            console.error("Error creating restaurant:", err);
            setError(err.message || "Error al crear el restaurante");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Crear Nuevo Restaurante">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-foreground">
                        Nombre del Restaurante
                    </label>
                    <div className="relative">
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. La Pizzería de Joe"
                            autoFocus
                            className="pl-9"
                        />
                        <Store className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Este será el nombre visible de tu negocio.
                    </p>
                </div>

                {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || !name.trim()}>
                        {loading && <Loader2 className="animate-spin mr-2" size={16} />}
                        Crear Restaurante
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
