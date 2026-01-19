"use client";

import { useState, useEffect } from "react";
import { Phone, Mail, MessageSquare, Tag as TagIcon, Plus, Loader2, Check, User } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Customer, Tag } from "@/lib/supabase/customer-queries";
import { TAG_ICONS } from "@/lib/tag-icons";
import { cn } from "@/lib/utils";
import { AddressInputWithMap } from "@/components/maps";

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Partial<Customer> | null;
    allTags: Tag[];
    selectedTags: string[];
    onToggleTag: (tagId: string) => void;
    onSave: (customer: Partial<Customer>) => Promise<void>;
    saving: boolean;
}

export function CustomerFormModal({
    isOpen,
    onClose,
    customer,
    allTags,
    selectedTags,
    onToggleTag,
    onSave,
    saving
}: CustomerFormModalProps) {
    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [showTagSelector, setShowTagSelector] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        }
    }, [customer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.first_name) return;
        await onSave(formData);
    };

    const handleChange = (field: keyof Customer, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const footerActions = (
        <div className="flex gap-3">
            <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
                Cancelar
            </button>
            <button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
                {saving && <Loader2 className="animate-spin" size={16} />}
                Guardar
            </button>
        </div>
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={customer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
            icon={User}
            size="lg"
            footer={footerActions}
        >
            <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre</label>
                        <input
                            required
                            placeholder="Ej: Juan"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.first_name || ""}
                            onChange={(e) => handleChange("first_name", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Apellido</label>
                        <input
                            placeholder="Ej: Pérez"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.last_name || ""}
                            onChange={(e) => handleChange("last_name", e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Phone size={14} className="text-primary" /> Teléfono
                        </label>
                        <input
                            type="tel"
                            placeholder="11 2345-6789"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.phone || ""}
                            onChange={(e) => handleChange("phone", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Mail size={14} className="text-primary" /> Correo
                        </label>
                        <input
                            type="email"
                            placeholder="correo@ejemplo.com"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.email || ""}
                            onChange={(e) => handleChange("email", e.target.value)}
                        />
                    </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                    {/* Google Places Address Input with Map */}
                    <AddressInputWithMap
                        value={formData.address_raw || ""}
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onChange={(address, lat, lng, placeId) => {
                            setFormData(prev => ({
                                ...prev,
                                address_raw: address,
                                latitude: lat ?? undefined,
                                longitude: lng ?? undefined,
                                google_place_id: placeId ?? undefined
                            }));
                        }}
                        placeholder="Buscar dirección del cliente..."
                        label="Dirección de envío"
                    />

                    {/* Floor and Apartment in same row */}
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            placeholder="Piso (ej: 3)"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.address_floor || ""}
                            onChange={(e) => handleChange("address_floor", e.target.value)}
                        />
                        <input
                            placeholder="Depto (ej: B)"
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.address_apartment || ""}
                            onChange={(e) => handleChange("address_apartment", e.target.value)}
                        />
                    </div>

                    {/* Delivery notes */}
                    <textarea
                        rows={2}
                        placeholder="Notas para el delivery (ej: Timbre roto, casa con rejas verdes...)"
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        value={formData.delivery_notes || ""}
                        onChange={(e) => handleChange("delivery_notes", e.target.value)}
                    />
                </div>

                {/* Tags Section */}
                <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <TagIcon size={14} className="text-primary" /> Etiquetas
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowTagSelector(!showTagSelector)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            <Plus size={12} />
                            {showTagSelector ? "Ocultar" : "Agregar"}
                        </button>
                    </div>

                    {/* Selected Tags Preview */}
                    <div className="flex flex-wrap gap-2">
                        {selectedTags.length > 0 ? (
                            selectedTags.map(tagId => {
                                // Try to find in allTags first, fallback to customer's own tags
                                const tag = allTags.find(t => t.id === tagId) ||
                                    (customer?.tags?.find(t => t.id === tagId));
                                if (!tag) return null;
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <span
                                        key={tag.id}
                                        className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold border"
                                        style={{
                                            backgroundColor: `${tag.color}15`,
                                            color: tag.color,
                                            borderColor: `${tag.color}50`
                                        }}
                                    >
                                        <IconComponent size={12} />
                                        {tag.name}
                                        <button
                                            type="button"
                                            onClick={() => onToggleTag(tag.id)}
                                            className="ml-1 hover:opacity-70"
                                        >
                                            ×
                                        </button>
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-xs text-muted-foreground italic">
                                Sin etiquetas
                            </span>
                        )}
                    </div>

                    {/* Tag Selector Grid - Collapsible */}
                    {showTagSelector && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[140px] overflow-y-auto p-1 bg-muted/30 rounded-xl">
                            {allTags.length === 0 && (
                                <p className="col-span-full text-xs text-muted-foreground italic py-2">
                                    No hay etiquetas configuradas.
                                </p>
                            )}
                            {allTags.map(tag => {
                                const isSelected = selectedTags.includes(tag.id);
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => onToggleTag(tag.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all text-left",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-border bg-card hover:bg-muted"
                                        )}
                                    >
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                                            style={{ backgroundColor: tag.color || '#ccc' }}
                                        >
                                            <IconComponent size={12} />
                                        </div>
                                        <span className="truncate">{tag.name}</span>
                                        {isSelected && <Check size={12} className="ml-auto text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare size={14} className="text-primary" /> Observaciones
                    </label>
                    <textarea
                        rows={3}
                        className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        value={formData.observations || ""}
                        onChange={(e) => handleChange("observations", e.target.value)}
                    />
                </div>
            </form>
        </Dialog>
    );
}
