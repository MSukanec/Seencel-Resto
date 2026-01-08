"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Tag, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTagModal } from "@/components/settings/create-tag-modal";
import { TAG_ICONS } from "@/lib/tag-icons";

interface GuestAttribute {
    id: string;
    name: string;
    category: string;
    color: string;
    icon: string;
    restaurant_id: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    dietary: "Dieta / Alergenos",
    accessibility: "Accesibilidad",
    family: "Familia",
    occasion: "Ocasión",
    preference: "Preferencia",
    status: "Estatus VIP",
    other: "Otros"
};

export default function TagsPage() {
    const [tags, setTags] = useState<GuestAttribute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filter, setFilter] = useState("all"); // 'all', 'system', 'custom'

    const supabase = createClient();

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        setLoading(true);
        // Supabase RLS will filter for us (System + Our Custom ones)
        const { data, error } = await supabase
            .from("guest_attributes")
            .select("*")
            .order("category", { ascending: true })
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching tags:", error);
        } else {
            setTags(data as any);
        }
        setLoading(false);
    };

    const handleCreateSuccess = () => {
        fetchTags();
        setShowCreateModal(false);
    };

    const filteredTags = tags.filter(tag => {
        if (filter === "system") return tag.restaurant_id === null;
        if (filter === "custom") return tag.restaurant_id !== null;
        return true;
    });

    // Group by category
    const groupedTags = filteredTags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {} as Record<string, GuestAttribute[]>);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[50vh]">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Etiquetas de Sistema</h1>
                    <p className="text-muted-foreground mt-2">
                        Gestiona las preferencias y necesidades especiales que puedes asignar a tus clientes y reservas.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                    >
                        <option value="all">Todas las etiquetas</option>
                        <option value="system">Solo Sistema</option>
                        <option value="custom">Solo Personalizadas</option>
                    </select>
                    <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                        <Plus size={18} />
                        Nueva Etiqueta
                    </Button>
                </div>
            </header>

            <div className="space-y-8">
                {Object.keys(groupedTags).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                        No se encontraron etiquetas con este filtro.
                    </div>
                )}

                {Object.entries(groupedTags).map(([category, categoryTags]) => (
                    <section key={category} className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                            {CATEGORY_LABELS[category] || category.toUpperCase()}
                            <span className="text-xs font-normal text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
                                {categoryTags.length}
                            </span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {categoryTags.map((tag) => {
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <div
                                        key={tag.id}
                                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                                    >
                                        {/* Color Indicator */}
                                        <div
                                            className="w-1.5 h-full absolute left-0 top-0 bottom-0"
                                            style={{ backgroundColor: tag.color || '#ccc' }}
                                        />

                                        <div
                                            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                                        >
                                            <IconComponent size={18} />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground truncate" title={tag.name}>
                                                {tag.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {tag.restaurant_id ? "Personalizada" : "Sistema"}
                                            </p>
                                        </div>

                                        {/* Only allow deleting custom tags */}
                                        {tag.restaurant_id && (
                                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Delete button capability could be added here */}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>

            <CreateTagModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}
