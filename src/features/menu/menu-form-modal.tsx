"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Check, Menu as MenuIcon, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu, upsertMenu } from "@/lib/supabase/menu-list-queries";

interface MenuFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (menu: Menu) => void;
    restaurantId: string;
    editingMenu?: Partial<Menu> | null;
    menusCount: number;
}

const MENU_COLORS = [
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
];

export function MenuFormModal({
    isOpen,
    onClose,
    onSuccess,
    restaurantId,
    editingMenu,
    menusCount
}: MenuFormModalProps) {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: MENU_COLORS[0],
        is_default: false
    });

    useEffect(() => {
        if (editingMenu) {
            setFormData({
                name: editingMenu.name || "",
                description: editingMenu.description || "",
                color: editingMenu.color || MENU_COLORS[0],
                is_default: editingMenu.is_default || false
            });
        } else {
            setFormData({
                name: "",
                description: "",
                color: MENU_COLORS[menusCount % MENU_COLORS.length],
                is_default: menusCount === 0
            });
        }
    }, [editingMenu, isOpen, menusCount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setSaving(true);
        const { data, error } = await upsertMenu({
            ...(editingMenu?.id ? { id: editingMenu.id } : {}),
            restaurant_id: restaurantId,
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            color: formData.color,
            is_default: formData.is_default,
            sort_order: editingMenu?.sort_order ?? menusCount
        });

        if (!error && data) {
            onSuccess?.(data);
            onClose();
        }
        setSaving(false);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingMenu?.id ? 'Editar Menú' : 'Nuevo Menú'}
            icon={MenuIcon}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre del Menú</label>
                    <input
                        type="text"
                        placeholder="Ej: Sushi Libre, Happy Hour, Menú Ejecutivo..."
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Descripción</label>
                    <textarea
                        placeholder="Descripción opcional del menú..."
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                        {MENU_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData({ ...formData, color })}
                                className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2",
                                    formData.color === color
                                        ? "border-foreground scale-110"
                                        : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                            >
                                {formData.color === color && <Check size={18} className="text-white" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                        className={cn(
                            "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                            formData.is_default
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border"
                        )}
                    >
                        {formData.is_default && <Check size={14} />}
                    </button>
                    <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                            <Star size={14} className="text-amber-500" />
                            Menú por defecto
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Este menú se usará automáticamente en días normales
                        </p>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !formData.name.trim()}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Guardar Menú"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
