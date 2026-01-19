"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import * as Accordion from "@radix-ui/react-accordion";
import { GripVertical, Plus, Pencil, Trash2, ChevronDown, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuCategory, MenuItem } from "@/lib/supabase/menu-queries";
import { KitchenSector } from "@/lib/supabase/sector-queries";
import { SortableItem } from "./sortable-item";

interface SortableCategoryProps {
    category: MenuCategory;
    sectors: KitchenSector[];
    onEditCategory: (cat: MenuCategory) => void;
    onDeleteCategory: (id: string) => void;
    onAddItem: (categoryId: string) => void;
    onViewItem: (item: MenuItem) => void;
    onEditItem: (item: MenuItem) => void;
    onDeleteItem: (id: string) => void;
    onToggleItemAvailability: (item: MenuItem) => void;
    onItemsDragEnd: (event: DragEndEvent, categoryId: string) => void;
    onBulkAssignSector: (categoryId: string) => void;
}

export function SortableCategory({
    category,
    sectors,
    onEditCategory,
    onDeleteCategory,
    onAddItem,
    onViewItem,
    onEditItem,
    onDeleteItem,
    onToggleItemAvailability,
    onItemsDragEnd,
    onBulkAssignSector
}: SortableCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 40 : 0
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-4">
            <Accordion.Item
                value={category.id}
                className={cn(
                    "border border-border rounded-2xl bg-card overflow-hidden shadow-sm transition-all duration-300",
                    isDragging && "opacity-50 ring-2 ring-primary border-primary"
                )}
            >
                <div className="flex items-center px-4 py-3 gap-3 border-b border-border/50">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                        <GripVertical size={20} />
                    </button>

                    <Accordion.Trigger className="flex-1 flex items-center justify-between group outline-none">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-lg">{category.name}</h3>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                                {category.items?.length || 0} items
                            </span>
                        </div>
                        <ChevronDown className="text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-300" size={18} />
                    </Accordion.Trigger>

                    <div className="flex items-center gap-1 border-l border-border pl-3 ml-2">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onBulkAssignSector(category.id); }}
                            className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors"
                            title="Asignar Sector a Todos"
                        >
                            <ChefHat size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                            title="Editar Categoría"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                            title="Eliminar Categoría"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                <Accordion.Content className="animate-in slide-in-from-top-1 duration-300">
                    <div className="p-4 bg-muted/20">
                        <DndContext
                            sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => onItemsDragEnd(e, category.id)}
                        >
                            <SortableContext
                                items={(category.items || []).map(i => i.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {/* Available items first */}
                                    {(category.items || [])
                                        .filter(item => item.is_available)
                                        .map((item) => (
                                            <SortableItem
                                                key={item.id}
                                                item={item}
                                                onView={onViewItem}
                                                onEdit={onEditItem}
                                                onDelete={onDeleteItem}
                                                onToggleAvailability={onToggleItemAvailability}
                                            />
                                        ))}

                                    {/* Unavailable items section */}
                                    {(category.items || []).filter(item => !item.is_available).length > 0 && (
                                        <>
                                            <div className="flex items-center gap-2 pt-2 pb-1">
                                                <div className="h-px flex-1 bg-border/50" />
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">No Disponibles</span>
                                                <div className="h-px flex-1 bg-border/50" />
                                            </div>
                                            {(category.items || [])
                                                .filter(item => !item.is_available)
                                                .map((item) => (
                                                    <SortableItem
                                                        key={item.id}
                                                        item={item}
                                                        onView={onViewItem}
                                                        onEdit={onEditItem}
                                                        onDelete={onDeleteItem}
                                                        onToggleAvailability={onToggleItemAvailability}
                                                    />
                                                ))}
                                        </>
                                    )}

                                    <button
                                        onClick={() => onAddItem(category.id)}
                                        className="w-full border-2 border-dashed border-border/50 rounded-xl py-3 flex items-center justify-center gap-2 text-muted-foreground hover:bg-background hover:text-primary hover:border-primary/30 transition-all group"
                                    >
                                        <Plus size={18} className="translate-y-px" />
                                        <span className="text-sm font-bold">Agregar Item a {category.name}</span>
                                    </button>
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </Accordion.Content>
            </Accordion.Item>
        </div>
    );
}
