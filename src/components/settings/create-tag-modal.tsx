"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Tag, Check, User, UtensilsCrossed } from "lucide-react";
import { AVAILABLE_ICONS } from "@/lib/tag-icons";

interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editTag?: {
        id: string;
        name: string;
        category: string;
        color: string;
        icon: string;
        applies_to: string[];
    } | null;
}

const CATEGORIES = [
    { id: "dietary", label: "Dieta / Alergenos" },
    { id: "accessibility", label: "Accesibilidad" },
    { id: "family", label: "Familia" },
    { id: "occasion", label: "Ocasión" },
    { id: "preference", label: "Preferencia" },
    { id: "status", label: "Estatus VIP" },
    { id: "other", label: "Otro" }
];

const COLORS = [
    { hex: "#ef4444", name: "Rojo" },
    { hex: "#f97316", name: "Naranja" },
    { hex: "#f59e0b", name: "Amarillo" },
    { hex: "#84cc16", name: "Lima" },
    { hex: "#22c55e", name: "Verde" },
    { hex: "#10b981", name: "Esmeralda" },
    { hex: "#06b6d4", name: "Cian" },
    { hex: "#3b82f6", name: "Azul" },
    { hex: "#6366f1", name: "Indigo" },
    { hex: "#8b5cf6", name: "Violeta" },
    { hex: "#d946ef", name: "Fucsia" },
    { hex: "#ec4899", name: "Rosa" },
    { hex: "#64748b", name: "Gris" },
    { hex: "#000000", name: "Negro" },
];

const APPLIES_TO_OPTIONS = [
    { id: "customer", label: "Clientes", icon: User },
    { id: "menu_item", label: "Comidas", icon: UtensilsCrossed },
];

export function TagModal({ isOpen, onClose, onSuccess, editTag }: TagModalProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("other");
    const [color, setColor] = useState(COLORS[7].hex);
    const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0].id);
    const [appliesTo, setAppliesTo] = useState<string[]>(["customer"]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const isEditing = !!editTag;

    // Populate form when editing
    useEffect(() => {
        if (editTag) {
            setName(editTag.name);
            setCategory(editTag.category);
            setColor(editTag.color);
            setSelectedIcon(editTag.icon || AVAILABLE_ICONS[0].id);
            setAppliesTo(editTag.applies_to || ["customer"]);
        } else {
            // Reset form for create mode
            setName("");
            setCategory("other");
            setColor(COLORS[7].hex);
            setSelectedIcon(AVAILABLE_ICONS[0].id);
            setAppliesTo(["customer"]);
        }
    }, [editTag, isOpen]);

    const toggleAppliesTo = (id: string) => {
        setAppliesTo(prev => {
            if (prev.includes(id)) {
                // Don't allow removing the last one
                if (prev.length === 1) return prev;
                return prev.filter(x => x !== id);
            }
            return [...prev, id];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const restaurantId = match ? match[2] : null;
            if (!restaurantId) throw new Error("No restaurant selected");

            if (isEditing && editTag) {
                // Update existing
                const { error } = await supabase
                    .from("tags")
                    .update({
                        name,
                        category,
                        color,
                        icon: selectedIcon,
                        applies_to: appliesTo
                    })
                    .eq("id", editTag.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from("tags")
                    .insert({
                        name,
                        category,
                        color,
                        restaurant_id: restaurantId,
                        icon: selectedIcon,
                        applies_to: appliesTo
                    });

                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar etiqueta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Editar Etiqueta" : "Nueva Etiqueta Personalizada"}
            icon={Tag}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Nombre de la Etiqueta</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Vegano, Sin Gluten"
                                className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    {/* Applies To */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Aplica a</label>
                        <div className="flex gap-3">
                            {APPLIES_TO_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = appliesTo.includes(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => toggleAppliesTo(option.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${isSelected
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="font-medium">{option.label}</span>
                                        {isSelected && <Check size={16} className="ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground">Selecciona al menos uno. Puede aplicar a ambos.</p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Icon Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Icono</label>
                        <div className="grid grid-cols-6 gap-2 p-3 bg-muted/30 rounded-xl border border-border/50 max-h-40 overflow-y-auto">
                            {AVAILABLE_ICONS.map((item) => {
                                const Icon = item.icon;
                                const isSelected = selectedIcon === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedIcon(item.id)}
                                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
                                        title={item.label}
                                    >
                                        <Icon size={20} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Color Identificativo</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
                            {COLORS.map((c) => (
                                <button
                                    key={c.hex}
                                    type="button"
                                    onClick={() => setColor(c.hex)}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${color === c.hex ? "border-foreground scale-110" : "border-transparent"}`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.name}
                                >
                                    {color === c.hex && <Check size={14} className="text-white drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading || !name || appliesTo.length === 0}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? "Guardar Cambios" : "Crear Etiqueta")}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

// Keep old export for backwards compatibility
export { TagModal as CreateTagModal };
