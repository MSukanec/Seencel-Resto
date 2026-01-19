"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { UtensilsCrossed, ChefHat, Tag as TagIcon, FileText, BookOpen, Pencil, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/lib/supabase/menu-queries";
import Image from "next/image";

interface ItemProfileModalProps {
    item: MenuItem | null;
    onClose: () => void;
    onEdit?: (item: MenuItem) => void;
}

export function ItemProfileModal({ item, onClose, onEdit }: ItemProfileModalProps) {
    const [activeTab, setActiveTab] = useState<"info" | "recipe">("info");

    if (!item) return null;

    return (
        <Dialog
            isOpen={!!item}
            onClose={onClose}
            title={item.name}
            icon={UtensilsCrossed}
            size="lg"
        >
            <div className="space-y-6">
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

                {/* Info Tab */}
                {activeTab === "info" && (
                    <div className="space-y-6">
                        {/* Header with image */}
                        <div className="flex gap-4">
                            {item.image_url ? (
                                <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                                    <Image
                                        src={item.image_url}
                                        alt={item.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                                    <UtensilsCrossed size={32} className="text-muted-foreground/40" />
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold">{item.name}</h3>
                                    {!item.is_available && (
                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold">
                                            No disponible
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <DollarSign size={18} className="text-primary" />
                                    <span className="text-2xl font-bold text-primary">${item.price.toLocaleString()}</span>
                                </div>
                                {item.code && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Código: {item.code}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        {item.description && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase">Descripción</label>
                                <p className="text-sm">{item.description}</p>
                            </div>
                        )}

                        {/* Sector */}
                        {item.sector && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <ChefHat size={12} />
                                    Sector de Preparación
                                </label>
                                <span
                                    className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
                                    style={{ backgroundColor: `${item.sector.color}15`, color: item.sector.color, border: `1px solid ${item.sector.color}30` }}
                                >
                                    <ChefHat size={14} />
                                    {item.sector.name}
                                </span>
                            </div>
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <TagIcon size={12} />
                                    Etiquetas
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag) => (
                                        <span
                                            key={tag.id}
                                            className="text-sm font-bold px-3 py-1 rounded-full"
                                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Recipe Tab */}
                {activeTab === "recipe" && (
                    <div className="space-y-4">
                        {item.recipe ? (
                            <div
                                className="recipe-content bg-muted/20 rounded-xl p-4 border border-border [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                                dangerouslySetInnerHTML={{ __html: item.recipe }}
                            />
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                                <p>Este producto no tiene receta cargada</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                {onEdit && (
                    <div className="pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(item);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
                        >
                            <Pencil size={16} />
                            Editar Producto
                        </button>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
