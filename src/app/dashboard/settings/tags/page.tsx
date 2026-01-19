"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, Tag, MoreVertical, Pencil, Trash2, User, UtensilsCrossed } from "lucide-react";
import { TagModal } from "@/components/settings/create-tag-modal";
import { TAG_ICONS } from "@/lib/tag-icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/ui/confirm-modal";

interface TagItem {
    id: string;
    name: string;
    category: string;
    color: string;
    icon: string;
    restaurant_id: string | null;
    applies_to: string[];
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

const APPLIES_TO_FILTER = [
    { id: "all", label: "Todas" },
    { id: "customer", label: "Clientes" },
    { id: "menu_item", label: "Comidas" },
];

export default function TagsPage() {
    const [tags, setTags] = useState<TagItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTag, setEditingTag] = useState<TagItem | null>(null);
    const [filter, setFilter] = useState("all"); // 'all', 'system', 'custom'
    const [appliesToFilter, setAppliesToFilter] = useState("all"); // 'all', 'customer', 'menu_item'
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const supabase = createClient();
    const confirm = useConfirm();

    useEffect(() => {
        fetchTags();
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

    const fetchTags = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("tags")
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

    const handleSuccess = () => {
        fetchTags();
        setShowModal(false);
        setEditingTag(null);
    };

    const handleEdit = (tag: TagItem) => {
        setOpenPopover(null);
        setEditingTag(tag);
        setShowModal(true);
    };

    const handleDelete = async (tag: TagItem) => {
        setOpenPopover(null);

        const confirmed = await confirm({
            title: "Eliminar Etiqueta",
            message: `¿Estás seguro de eliminar la etiqueta "${tag.name}"? Esta acción no se puede deshacer.`,
            variant: "danger"
        });

        if (!confirmed) return;

        const { error } = await supabase
            .from("tags")
            .delete()
            .eq("id", tag.id);

        if (error) {
            console.error("Error deleting tag:", error);
        } else {
            fetchTags();
        }
    };

    const filteredTags = tags.filter(tag => {
        // Filter by system/custom
        if (filter === "system" && tag.restaurant_id !== null) return false;
        if (filter === "custom" && tag.restaurant_id === null) return false;

        // Filter by applies_to
        if (appliesToFilter !== "all") {
            if (!tag.applies_to || !tag.applies_to.includes(appliesToFilter)) return false;
        }

        return true;
    });

    // Group by category
    const groupedTags = filteredTags.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {} as Record<string, TagItem[]>);

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-muted/30">
                <PageHeader
                    icon={Tag}
                    title="Etiquetas"
                    subtitle="Cargando..."
                />
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Tag}
                title="Etiquetas"
                subtitle={`${tags.length} etiquetas configuradas`}
                actions={
                    <div className="flex items-center gap-2">
                        {/* Applies To Filter */}
                        <select
                            value={appliesToFilter}
                            onChange={(e) => setAppliesToFilter(e.target.value)}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                        >
                            {APPLIES_TO_FILTER.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>

                        {/* System/Custom Filter */}
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                        >
                            <option value="all">Todas</option>
                            <option value="system">Sistema</option>
                            <option value="custom">Personalizadas</option>
                        </select>

                        <button
                            onClick={() => {
                                setEditingTag(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                        >
                            <Plus size={18} />
                            Nueva Etiqueta
                        </button>
                    </div>
                }
            />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto space-y-8">
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
                                    const isCustom = tag.restaurant_id !== null;

                                    return (
                                        <div
                                            key={tag.id}
                                            className="flex items-center gap-3 p-3 pl-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow relative group"
                                        >
                                            {/* Color Indicator */}
                                            <div
                                                className="w-1.5 absolute left-0 top-0 bottom-0 rounded-l-xl"
                                                style={{ backgroundColor: tag.color || '#ccc' }}
                                            />

                                            <div
                                                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                                            >
                                                <IconComponent size={18} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-foreground truncate" title={tag.name}>
                                                    {tag.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span>{isCustom ? "Personalizada" : "Sistema"}</span>
                                                    {tag.applies_to && (
                                                        <>
                                                            <span className="text-border">•</span>
                                                            <div className="flex items-center gap-0.5">
                                                                {tag.applies_to.includes("customer") && <User size={10} />}
                                                                {tag.applies_to.includes("menu_item") && <UtensilsCrossed size={10} />}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions Popover - Only for custom tags */}
                                            {isCustom && (
                                                <div
                                                    className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                                                    ref={openPopover === tag.id ? popoverRef : null}
                                                >
                                                    <button
                                                        onClick={() => setOpenPopover(openPopover === tag.id ? null : tag.id)}
                                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {openPopover === tag.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                                            <button
                                                                onClick={() => handleEdit(tag)}
                                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                                                            >
                                                                <Pencil size={14} />
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(tag)}
                                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <TagModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setEditingTag(null);
                    }}
                    onSuccess={handleSuccess}
                    editTag={editingTag}
                />
            </div>
        </div>
    );
}
