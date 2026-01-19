"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Upload, ImageIcon, X, Check, EyeOff, ChefHat, UtensilsCrossed, Tag, FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuItem, upsertMenuItem, MenuCategory, getMenuItemTags, syncMenuItemTags, MenuItemTag } from "@/lib/supabase/menu-queries";
import { KitchenSector } from "@/lib/supabase/sector-queries";
import { compressImage } from "@/lib/image-utils";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import Image from "next/image";

interface ItemFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    restaurantId: string;
    editingItem?: Partial<MenuItem> | null;
    sectors: KitchenSector[];
    itemsCount: number;
}

export function ItemFormModal({
    isOpen,
    onClose,
    onSuccess,
    restaurantId,
    editingItem,
    sectors,
    itemsCount
}: ItemFormModalProps) {
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "recipe">("info");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Tags state
    const [availableTags, setAvailableTags] = useState<any[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: 0,
        is_available: true,
        image_url: "",
        sector_id: "",
        category_id: "",
        recipe: ""
    });

    // Load available tags
    useEffect(() => {
        if (restaurantId && isOpen) {
            getMenuItemTags(restaurantId).then(({ data }) => {
                if (data) setAvailableTags(data);
            });
        }
    }, [restaurantId, isOpen]);

    useEffect(() => {
        if (editingItem) {
            setFormData({
                name: editingItem.name || "",
                description: editingItem.description || "",
                price: editingItem.price || 0,
                is_available: editingItem.is_available ?? true,
                image_url: editingItem.image_url || "",
                sector_id: editingItem.sector_id || "",
                category_id: editingItem.category_id || "",
                recipe: editingItem.recipe || ""
            });
            // Set selected tags from editingItem
            setSelectedTagIds((editingItem as any).tags?.map((t: any) => t.id) || []);
        } else {
            setFormData({
                name: "",
                description: "",
                price: 0,
                is_available: true,
                image_url: "",
                sector_id: "",
                category_id: "",
                recipe: ""
            });
            setSelectedTagIds([]);
        }
        setActiveTab("info"); // Reset to info tab
    }, [editingItem, isOpen]);

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
            setFormData({ ...formData, image_url: publicUrl });
        } catch (error: any) {
            console.error("Upload failed:", error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.category_id) return;

        setSaving(true);
        const { data, error } = await upsertMenuItem({
            ...(editingItem?.id ? { id: editingItem.id, sort_order: editingItem.sort_order } : {}),
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            price: formData.price,
            is_available: formData.is_available,
            image_url: formData.image_url || undefined,
            sector_id: formData.sector_id || undefined,
            category_id: formData.category_id,
            sort_order: editingItem?.id ? editingItem.sort_order : itemsCount,
            recipe: formData.recipe || undefined
        });

        if (!error && data) {
            // Sync tags for the item
            await syncMenuItemTags(data.id, selectedTagIds);
            onSuccess?.();
            onClose();
        }
        setSaving(false);
    };

    // Set category_id when editingItem changes
    useEffect(() => {
        if (editingItem?.category_id) {
            setFormData(prev => ({ ...prev, category_id: editingItem.category_id! }));
        }
    }, [editingItem]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingItem?.id ? 'Editar Producto' : 'Nuevo Producto'}
            icon={UtensilsCrossed}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-border pb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab("info")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === "info"
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <FileText size={16} />
                        Información
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("recipe")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === "recipe"
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <BookOpen size={16} />
                        Receta
                    </button>
                </div>

                {activeTab === "info" && (
                    <>
                        {/* Image Upload */}
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
                                    {formData.image_url ? (
                                        <>
                                            <Image src={formData.image_url} alt="Preview" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload className="text-white" size={20} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_url: "" }); }}
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
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted"
                                >
                                    <Upload size={16} />
                                    {uploading ? "Subiendo..." : "Subir imagen"}
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-1 sm:col-span-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <input
                                    required
                                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Precio</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-[11px] text-muted-foreground text-sm font-bold">$</span>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-input border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Disponibilidad</label>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                                    className={cn(
                                        "w-full h-11 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all",
                                        formData.is_available ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-muted border-border text-muted-foreground"
                                    )}
                                >
                                    {formData.is_available ? <Check size={16} /> : <EyeOff size={16} />}
                                    {formData.is_available ? "Disponible" : "No disponible"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Descripción / Ingredientes</label>
                            <textarea
                                placeholder="Ej. Medallón de carne de 200g, cheddar, bacon..."
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {sectors.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <ChefHat size={16} className="text-primary" />
                                    Sector de Preparación
                                </label>
                                <select
                                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                    value={formData.sector_id}
                                    onChange={(e) => setFormData({ ...formData, sector_id: e.target.value })}
                                >
                                    <option value="">Sin sector asignado</option>
                                    {sectors.map((sector) => (
                                        <option key={sector.id} value={sector.id}>{sector.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tags Section */}
                        {availableTags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Tag size={16} className="text-primary" />
                                    Características / Etiquetas
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map((tag) => {
                                        const isSelected = selectedTagIds.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                                                    } else {
                                                        setSelectedTagIds([...selectedTagIds, tag.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                                                )}
                                                style={isSelected ? { borderColor: tag.color, backgroundColor: `${tag.color}15`, color: tag.color } : {}}
                                            >
                                                {isSelected && <Check size={12} />}
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Recipe Tab */}
                {activeTab === "recipe" && (
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Escribí la receta o instrucciones de preparación para este producto.
                        </div>
                        <RichTextEditor
                            value={formData.recipe}
                            onChange={(value) => setFormData({ ...formData, recipe: value })}
                            placeholder="Ej: Ingredientes: 200g de carne picada..."
                            minHeight="250px"
                        />
                    </div>
                )}

                {/* Buttons - always visible */}
                <div className="pt-4 flex gap-3 border-t border-border mt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                        {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Guardar Producto"}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
