"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Eye, EyeOff, ImageIcon, ChefHat, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/lib/supabase/menu-queries";
import { MiniTagBadges } from "@/components/ui/mini-tag-badge";
import Image from "next/image";

interface SortableItemProps {
    item: MenuItem;
    onView: (item: MenuItem) => void;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (item: MenuItem) => void;
}

export function SortableItem({ item, onView, onEdit, onDelete, onToggleAvailability }: SortableItemProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onView(item)}
            className={cn(
                "group flex items-center gap-4 bg-background border border-border rounded-xl p-4 hover:border-primary/30 transition-all shadow-sm cursor-pointer",
                !item.is_available && "opacity-50 bg-muted/50 grayscale-[30%] border-dashed"
            )}
        >
            {/* Drag Handle */}
            <button
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
            >
                <GripVertical size={18} />
            </button>

            {/* Larger Thumbnail */}
            {item.image_url ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-muted shadow-sm">
                    <Image
                        src={item.image_url}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-muted/50 flex items-center justify-center border border-dashed border-border">
                    <ImageIcon size={24} className="text-muted-foreground/40" />
                </div>
            )}

            {/* Name, Description, Tags */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <h4 className="font-bold text-lg truncate">{item.name}</h4>
                    {!item.is_available && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold shrink-0">
                            No disponible
                        </span>
                    )}
                    {/* Mini Tag Badges - next to title */}
                    <MiniTagBadges tags={item.tags || []} size="md" maxVisible={4} />
                </div>
                {item.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{item.description}</p>
                )}
            </div>

            {/* Sector Badge */}
            {item.sector && (
                <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${item.sector.color}15`, color: item.sector.color, border: `1px solid ${item.sector.color}30` }}
                >
                    <ChefHat size={12} />
                    {item.sector.name}
                </span>
            )}

            {/* Price */}
            <div className="text-lg font-bold text-primary px-3 shrink-0">
                ${item.price.toLocaleString()}
            </div>

            {/* Actions Menu - Always visible */}
            <div className="relative shrink-0">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                >
                    <MoreVertical size={18} />
                </button>

                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                            }}
                        />
                        {/* Popover */}
                        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-150">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onToggleAvailability(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                            >
                                {item.is_available ? <EyeOff size={15} /> : <Eye size={15} />}
                                {item.is_available ? "Marcar no disponible" : "Marcar disponible"}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onEdit(item);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors text-left"
                            >
                                <Pencil size={15} />
                                Editar producto
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onDelete(item.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-destructive/5 hover:text-destructive transition-colors text-left font-medium"
                            >
                                <Trash2 size={15} />
                                Eliminar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
