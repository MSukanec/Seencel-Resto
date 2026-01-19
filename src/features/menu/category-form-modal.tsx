"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, FolderOpen } from "lucide-react";
import { MenuCategory, upsertCategory } from "@/lib/supabase/menu-queries";

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    restaurantId: string;
    editingCategory?: Partial<MenuCategory> | null;
    categoriesCount: number;
}

export function CategoryFormModal({
    isOpen,
    onClose,
    onSuccess,
    restaurantId,
    editingCategory,
    categoriesCount
}: CategoryFormModalProps) {
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name || "");
            setDescription(editingCategory.description || "");
        } else {
            setName("");
            setDescription("");
        }
    }, [editingCategory, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        const { error } = await upsertCategory({
            ...(editingCategory?.id ? { id: editingCategory.id, sort_order: editingCategory.sort_order } : {}),
            name: name.trim(),
            description: description.trim() || undefined,
            restaurant_id: restaurantId,
            sort_order: editingCategory?.id ? editingCategory.sort_order : categoriesCount
        });

        if (!error) {
            onSuccess?.();
            onClose();
        }
        setSaving(false);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingCategory?.id ? 'Editar Categoría' : 'Nueva Categoría'}
            icon={FolderOpen}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre de la Categoría</label>
                    <input
                        required
                        placeholder="Ej. Entradas, Platos Principales, Bebidas..."
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        Descripción <span className="text-[10px] uppercase font-bold text-muted-foreground/50 border border-muted-foreground/30 px-1 rounded">Opcional</span>
                    </label>
                    <textarea
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Guardar Categoría"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
