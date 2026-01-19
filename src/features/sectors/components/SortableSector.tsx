"use client";

import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { type KitchenSector } from "@/lib/supabase/sector-queries";
import { getSectorIcon } from "./sector-icons";

interface SortableSectorProps {
    sector: KitchenSector;
    onEdit: (sector: KitchenSector) => void;
    onDelete: (id: string) => void;
}

export function SortableSector({ sector, onEdit, onDelete }: SortableSectorProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: sector.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    const Icon = getSectorIcon(sector.icon);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all group",
                isDragging && "ring-2 ring-primary"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            >
                <GripVertical size={18} />
            </button>
            <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${sector.color}20` }}
            >
                <Icon size={20} style={{ color: sector.color }} />
            </div>
            <div className="flex-1">
                <p className="font-medium">{sector.name}</p>
                {sector.description && (
                    <p className="text-sm text-muted-foreground">{sector.description}</p>
                )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(sector)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <Pencil size={16} />
                </button>
                <button
                    onClick={() => onDelete(sector.id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
