"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTOR_ICONS, SECTOR_COLORS } from "./index";
import { createSector, updateSector, type KitchenSector } from "@/lib/supabase/sector-queries";

interface SectorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    restaurantId: string;
    editingSector?: KitchenSector | null;
}

export function SectorFormModal({ isOpen, onClose, onSuccess, restaurantId, editingSector }: SectorFormModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#10b981",
        icon: "chef-hat"
    });

    // Reset form when modal opens/closes or editing sector changes
    useEffect(() => {
        if (editingSector) {
            setFormData({
                name: editingSector.name,
                description: editingSector.description || "",
                color: editingSector.color,
                icon: editingSector.icon
            });
        } else {
            setFormData({ name: "", description: "", color: "#10b981", icon: "chef-hat" });
        }
    }, [editingSector, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        try {
            if (editingSector) {
                const { error } = await updateSector(editingSector.id, formData);
                if (error) throw error;
            } else {
                const { error } = await createSector({
                    restaurant_id: restaurantId,
                    ...formData
                });
                if (error) throw error;
            }
            onSuccess?.();
            onClose();
        } catch {
            // Error handling could use toast in future
        }
        setSaving(false);
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={editingSector ? "Editar Sector" : "Nuevo Sector"} icon={LayoutGrid}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Cocina Principal"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ej: Platos calientes"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Icon selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Ícono</label>
                        <div className="flex gap-2 flex-wrap">
                            {SECTOR_ICONS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, icon: item.name })}
                                        className={cn(
                                            "p-2 rounded-lg border transition-all",
                                            formData.icon === item.name
                                                ? "border-primary bg-primary/10"
                                                : "border-border hover:border-primary/50"
                                        )}
                                        title={item.label}
                                    >
                                        <Icon size={20} style={{ color: formData.color }} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color selector */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {SECTOR_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c.value })}
                                    className={cn(
                                        "w-8 h-8 rounded-full transition-all",
                                        formData.color === c.value
                                            ? "ring-2 ring-offset-2 ring-primary"
                                            : "hover:scale-110"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !formData.name.trim()}
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : editingSector ? "Guardar" : "Crear"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
