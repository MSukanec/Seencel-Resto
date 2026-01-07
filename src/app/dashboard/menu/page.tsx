"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import {
    Plus,
    GripVertical,
    MoreVertical,
    Pencil,
    Trash2,
    ChevronDown,
    UtensilsCrossed,
    Search,
    Loader2,
    Eye,
    EyeOff,
    Check,
    Upload,
    Camera,
    ImageIcon,
    X
} from "lucide-react";
import {
    getMenu,
    MenuCategory,
    MenuItem,
    upsertCategory,
    deleteCategory,
    upsertMenuItem,
    deleteMenuItem,
    updateCategorySort,
    updateItemSort
} from "@/lib/supabase/menu-queries";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import * as Accordion from "@radix-ui/react-accordion";
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
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { compressImage } from "@/lib/image-utils";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

// --- Components ---

interface SortableItemProps {
    item: MenuItem;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleAvailability: (item: MenuItem) => void;
}

function SortableItem({ item, onEdit, onDelete, onToggleAvailability }: SortableItemProps) {
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
            className={cn(
                "group flex items-center gap-4 bg-background border border-border rounded-xl p-3 hover:border-primary/30 transition-all shadow-sm",
                !item.is_available && "opacity-60 bg-muted/30"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
            >
                <GripVertical size={16} />
            </button>

            {/* Thumbnail */}
            {item.image_url ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border bg-muted">
                    <Image
                        src={item.image_url}
                        alt={item.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-muted/50 flex items-center justify-center border border-dashed border-border">
                    <ImageIcon size={16} className="text-muted-foreground/40" />
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm truncate">{item.name}</h4>
                    {!item.is_available && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold">
                            No disponible
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground truncate italic">{item.description}</p>
                )}
            </div>

            <div className="text-sm font-bold text-primary px-3">
                ${item.price.toLocaleString()}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onToggleAvailability(item)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                    title={item.is_available ? "Marcar como no disponible" : "Marcar como disponible"}
                >
                    {item.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                    onClick={() => onEdit(item)}
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                    title="Editar"
                >
                    <Pencil size={16} />
                </button>
                <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                    title="Eliminar"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

interface SortableCategoryProps {
    category: MenuCategory;
    onEditCategory: (cat: MenuCategory) => void;
    onDeleteCategory: (id: string) => void;
    onAddItem: (categoryId: string) => void;
    onEditItem: (item: MenuItem) => void;
    onDeleteItem: (id: string) => void;
    onToggleItemAvailability: (item: MenuItem) => void;
    onItemsDragEnd: (event: DragEndEvent, categoryId: string) => void;
}

function SortableCategory({
    category,
    onEditCategory,
    onDeleteCategory,
    onAddItem,
    onEditItem,
    onDeleteItem,
    onToggleItemAvailability,
    onItemsDragEnd
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
                            onClick={() => onEditCategory(category)}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                            title="Editar Categoría"
                        >
                            <Pencil size={18} />
                        </button>
                        <button
                            onClick={() => onDeleteCategory(category.id)}
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
                                    {(category.items || []).map((item) => (
                                        <SortableItem
                                            key={item.id}
                                            item={item}
                                            onEdit={onEditItem}
                                            onDelete={onDeleteItem}
                                            onToggleAvailability={onToggleItemAvailability}
                                        />
                                    ))}

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

// --- Main Page ---

export default function MenuPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Modals state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<MenuCategory> | null>(null);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const id = document.cookie.match(/(^| )selected_restaurant_id=([^;]+)/)?.[2];
        if (id) {
            setRestaurantId(id);
            fetchMenu(id);
        }
    }, []);

    const fetchMenu = async (id: string) => {
        setLoading(true);
        const { data, error } = await getMenu(id);
        if (!error && data) {
            setCategories(data);
        }
        setLoading(false);
    };

    // --- Handlers ---

    const handleDragEndCategories = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);

        const newCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(newCategories);

        // Sync to DB
        const updates = newCategories.map((cat, idx) => ({ id: cat.id, sort_order: idx }));
        await updateCategorySort(updates);
    };

    const handleDragEndItems = async (event: DragEndEvent, categoryId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const category = categories.find(c => c.id === categoryId);
        if (!category || !category.items) return;

        const oldIndex = category.items.findIndex(i => i.id === active.id);
        const newIndex = category.items.findIndex(i => i.id === over.id);

        const newItems = arrayMove(category.items, oldIndex, newIndex);

        // Update local state
        setCategories(categories.map(c =>
            c.id === categoryId ? { ...c, items: newItems } : c
        ));

        // Sync to DB
        const updates = newItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
        await updateItemSort(updates);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCategory?.name || !restaurantId) return;

        setSaving(true);
        const { error } = await upsertCategory({
            ...editingCategory,
            restaurant_id: restaurantId,
            sort_order: (editingCategory as any).id ? (editingCategory as any).sort_order : categories.length
        });

        if (!error) {
            await fetchMenu(restaurantId);
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
        }
        setSaving(false);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem?.name || !editingItem?.category_id) return;

        setSaving(true);
        const category = categories.find(c => c.id === editingItem.category_id);
        const { error } = await upsertMenuItem({
            ...editingItem,
            sort_order: editingItem.id ? editingItem.sort_order : (category?.items?.length || 0)
        });

        if (!error) {
            await fetchMenu(restaurantId!);
            setIsItemModalOpen(false);
            setEditingItem(null);
        }
        setSaving(false);
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("¿Eliminar categoría? Esto borrará todos sus items.")) return;
        await deleteCategory(id);
        fetchMenu(restaurantId!);
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("¿Eliminar este item?")) return;
        await deleteMenuItem(id);
        fetchMenu(restaurantId!);
    };

    const toggleItemAvailability = async (item: MenuItem) => {
        await upsertMenuItem({ ...item, is_available: !item.is_available });
        fetchMenu(restaurantId!);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const optimizedFile = await compressImage(file, 600, 0.8);
            const timestamp = Date.now();
            const itemId = editingItem?.id || `new_${timestamp}`;
            const filePath = `${restaurantId}/menu/${itemId}_${timestamp}.jpg`;

            const { error: uploadError } = await supabase
                .storage
                .from('menu-items')
                .upload(filePath, optimizedFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('menu-items').getPublicUrl(filePath);
            setEditingItem({ ...editingItem, image_url: publicUrl });
        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Error al subir imagen: ${error.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-8 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <UtensilsCrossed size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Gestión de Menú</h1>
                        <p className="text-xs text-muted-foreground">{categories.length} categorías registradas</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingCategory({ name: "" });
                            setIsCategoryModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Nueva Categoría
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="p-10 bg-muted rounded-full">
                            <UtensilsCrossed size={64} className="text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Tu Menú está vacío</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                Agrega tu primera categoría (ej: "Entradas") para empezar a organizar tus platos.
                            </p>
                            <button
                                onClick={() => {
                                    setEditingCategory({ name: "" });
                                    setIsCategoryModalOpen(true);
                                }}
                                className="mt-4 bg-primary/10 text-primary px-6 py-2 rounded-full text-sm font-bold hover:bg-primary hover:text-white transition-all"
                            >
                                Crear mi primera categoría
                            </button>
                        </div>
                    </div>
                ) : (
                    <Accordion.Root type="multiple" className="w-full">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEndCategories}
                        >
                            <SortableContext
                                items={categories.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {categories.map((category) => (
                                    <SortableCategory
                                        key={category.id}
                                        category={category}
                                        onEditCategory={(cat) => {
                                            setEditingCategory(cat);
                                            setIsCategoryModalOpen(true);
                                        }}
                                        onDeleteCategory={handleDeleteCategory}
                                        onAddItem={(catId) => {
                                            setEditingItem({ name: "", category_id: catId, price: 0, is_available: true });
                                            setIsItemModalOpen(true);
                                        }}
                                        onEditItem={(item) => {
                                            setEditingItem(item);
                                            setIsItemModalOpen(true);
                                        }}
                                        onDeleteItem={handleDeleteItem}
                                        onToggleItemAvailability={toggleItemAvailability}
                                        onItemsDragEnd={handleDragEndItems}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </Accordion.Root>
                )}
            </div>

            {/* Category Modal */}
            <Dialog
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                title={editingCategory?.id ? 'Editar Categoría' : 'Nueva Categoría'}
            >
                <form onSubmit={handleSaveCategory} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre de la Categoría</label>
                        <input
                            required
                            placeholder="Ej. Entradas, Platos Principales, Bebidas..."
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={editingCategory?.name || ""}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            Descripción <span className="text-[10px] uppercase font-bold text-muted-foreground/50 border border-muted-foreground/30 px-1 rounded">Opcional</span>
                        </label>
                        <textarea
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
                            value={editingCategory?.description || ""}
                            onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                            {saving ? "Guardando..." : "Guardar Categoría"}
                        </button>
                    </div>
                </form>
            </Dialog>

            {/* Item Modal */}
            <Dialog
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                title={editingItem?.id ? 'Editar Producto' : 'Nuevo Producto'}
            >
                <form onSubmit={handleSaveItem} className="space-y-6">
                    {/* Image Upload Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            Foto del Producto
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/50 border border-muted-foreground/30 px-1 rounded">Opcional</span>
                        </label>
                        <div className="flex items-center gap-4">
                            <div
                                className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-all"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {editingItem?.image_url ? (
                                    <>
                                        <Image
                                            src={editingItem.image_url}
                                            alt="Preview"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                            unoptimized
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white" size={20} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingItem({ ...editingItem, image_url: undefined });
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : uploading ? (
                                    <Loader2 className="animate-spin text-primary" size={24} />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                        <ImageIcon size={24} />
                                        <span className="text-[10px] font-medium">Subir</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    <Upload size={16} />
                                    {uploading ? "Subiendo..." : "Subir imagen"}
                                </button>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-1 sm:col-span-2">
                            <label className="text-sm font-medium">Nombre del Plato / Producto</label>
                            <input
                                required
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={editingItem?.name || ""}
                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Precio</label>
                            <div className="relative group/price">
                                <span className="absolute left-4 top-[11px] text-muted-foreground text-sm font-bold z-10">$</span>
                                <input
                                    type="number"
                                    required
                                    className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={editingItem?.price || 0}
                                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Disponibilidad</label>
                            <div className="flex h-11 items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem?.is_available })}
                                    className={cn(
                                        "w-full h-full rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all",
                                        editingItem?.is_available
                                            ? "bg-green-500/10 border-green-500/30 text-green-600"
                                            : "bg-muted border-border text-muted-foreground"
                                    )}
                                >
                                    {editingItem?.is_available ? <Check size={16} /> : <EyeOff size={16} />}
                                    {editingItem?.is_available ? "Disponible" : "No disponible"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descripción / Ingredientes</label>
                        <textarea
                            placeholder="Ej. Medallón de carne de 200g, cheddar, bacon y pan brioche..."
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
                            value={editingItem?.description || ""}
                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                            {saving ? "Guardando..." : "Guardar Producto"}
                        </button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
