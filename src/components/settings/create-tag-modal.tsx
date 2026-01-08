"use client";
// Force rebuild

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Tag, Check } from "lucide-react";
import { AVAILABLE_ICONS } from "@/lib/tag-icons";

interface CreateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

export function CreateTagModal({ isOpen, onClose, onSuccess }: CreateTagModalProps) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("other");
    const [color, setColor] = useState(COLORS[7].hex); // Default blue
    const [selectedIcon, setSelectedIcon] = useState(AVAILABLE_ICONS[0].id);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Get current restaurant
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const restaurantId = match ? match[2] : null;
            if (!restaurantId) throw new Error("No restaurant selected");

            const { error } = await supabase
                .from("guest_attributes")
                .insert({
                    name,
                    category,
                    color,
                    restaurant_id: restaurantId,
                    icon: selectedIcon
                });

            if (error) throw error;

            onSuccess();
            // Reset form
            setName("");
            setCategory("other");
            setColor(COLORS[7].hex);
            setSelectedIcon(AVAILABLE_ICONS[0].id);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al crear etiqueta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Nueva Etiqueta Personalizada">
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
                                placeholder="Ej: Mesa cerca del baño"
                                className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
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
                    <Button type="submit" disabled={loading || !name}>
                        {loading ? <Loader2 className="animate-spin" size={16} /> : "Crear Etiqueta"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
