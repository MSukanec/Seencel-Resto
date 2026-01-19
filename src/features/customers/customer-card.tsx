"use client";

import { MoreVertical, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import { Customer } from "@/lib/supabase/customer-queries";
import { MiniTagBadges } from "@/components/ui/mini-tag-badge";

interface CustomerCardProps {
    customer: Customer;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function CustomerCard({
    customer,
    isMenuOpen,
    onToggleMenu,
    onView,
    onEdit,
    onDelete
}: CustomerCardProps) {
    return (
        <div
            onClick={onView}
            className="group bg-card border border-border/60 rounded-xl px-6 py-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative min-h-[100px] cursor-pointer"
        >
            {/* Avatar */}
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {customer.first_name[0]}{customer.last_name?.[0]}
            </div>

            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* Name & ID */}
                <div className="flex flex-col">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                        {customer.first_name} {customer.last_name}
                    </h3>
                    <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold opacity-60">
                        ID: {customer.id.slice(0, 8)}
                    </div>
                </div>

                {/* Contact */}
                <div className="flex flex-col gap-1">
                    {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone size={13} className="text-primary/70 shrink-0" />
                            {customer.phone}
                        </div>
                    )}
                    {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                            <Mail size={13} className="text-primary/70 shrink-0" />
                            <span className="truncate max-w-[150px]">{customer.email}</span>
                        </div>
                    )}
                </div>

                {/* Address */}
                <div className="flex flex-col justify-center">
                    {customer.address_raw && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin size={13} className="text-primary/70 shrink-0" />
                            <span className="line-clamp-2 text-xs">{customer.address_raw}</span>
                        </div>
                    )}
                </div>

                {/* Tags Display - Using reusable component */}
                <div className="flex flex-wrap gap-1 justify-start lg:justify-end">
                    {customer.tags && customer.tags.length > 0 ? (
                        <MiniTagBadges tags={customer.tags} size="md" maxVisible={5} />
                    ) : (
                        <div className="text-xs text-muted-foreground/40 italic">
                            Sin etiquetas
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Menu */}
            <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu();
                    }}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                >
                    <MoreVertical size={18} />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-150">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary transition-colors text-left"
                        >
                            <Pencil size={14} /> Editar
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/5 hover:text-destructive transition-colors text-left font-medium"
                        >
                            <Trash2 size={14} /> Eliminar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
