"use client";

import { Phone, Mail, MapPin, MessageSquare, Pencil, User, ExternalLink } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Customer } from "@/lib/supabase/customer-queries";
import { TAG_ICONS } from "@/lib/tag-icons";

interface CustomerProfileModalProps {
    customer: Customer | null;
    onClose: () => void;
    onEdit: (customer: Customer) => void;
}

export function CustomerProfileModal({ customer, onClose, onEdit }: CustomerProfileModalProps) {
    if (!customer) return null;

    // Build Google Maps URL
    const getGoogleMapsUrl = () => {
        if (customer.latitude && customer.longitude) {
            return `https://www.google.com/maps/search/?api=1&query=${customer.latitude},${customer.longitude}`;
        }
        if (customer.address_raw) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customer.address_raw)}`;
        }
        return null;
    };

    const mapsUrl = getGoogleMapsUrl();

    return (
        <Dialog
            isOpen={!!customer}
            onClose={onClose}
            title="Perfil del Cliente"
            icon={User}
        >
            <div className="space-y-4">
                {/* Header Profile */}
                <div className="flex items-center gap-5">
                    <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shadow-sm border border-primary/10">
                        {customer.first_name?.[0]}{customer.last_name?.[0]}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h2>
                        <p className="text-sm text-muted-foreground font-mono mt-1">ID: {customer.id.slice(0, 8)}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {customer.tags?.map(tag => {
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <span
                                        key={tag.id}
                                        className="px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide border"
                                        style={{
                                            backgroundColor: `${tag.color}10`,
                                            color: tag.color,
                                            borderColor: `${tag.color}30`
                                        }}
                                    >
                                        <IconComponent size={10} strokeWidth={3} />
                                        {tag.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Contact Box */}
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Contacto</h3>

                    <div className="space-y-3">
                        {customer.phone ? (
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background rounded-lg text-primary shadow-sm">
                                        <Phone size={16} />
                                    </div>
                                    <span className="font-medium text-sm">{customer.phone}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a
                                        href={`tel:${customer.phone}`}
                                        className="p-1.5 hover:bg-primary/10 rounded-md text-primary tooltip"
                                        title="Llamar"
                                    >
                                        <Phone size={14} />
                                    </a>
                                    <a
                                        href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 hover:bg-green-500/10 rounded-md text-green-600 tooltip"
                                        title="WhatsApp"
                                    >
                                        <MessageSquare size={14} />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic pl-11">Sin teléfono</div>
                        )}

                        {customer.email ? (
                            <div className="flex items-center justify-between group">
                                <a href={`mailto:${customer.email}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                    <div className="p-2 bg-background rounded-lg text-primary shadow-sm">
                                        <Mail size={16} />
                                    </div>
                                    <span className="font-medium text-sm truncate max-w-[250px]">{customer.email}</span>
                                </a>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic pl-11">Sin email</div>
                        )}
                    </div>
                </div>

                {/* Address Box - Clickable to open Google Maps */}
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Dirección</h3>
                    {customer.address_raw ? (
                        <a
                            href={mapsUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 group cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="p-2 bg-background rounded-lg text-primary shadow-sm h-min group-hover:bg-primary/10 transition-colors">
                                <MapPin size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm leading-relaxed">{customer.address_raw}</p>
                                {(customer.address_floor || customer.address_apartment) && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {customer.address_floor && `Piso ${customer.address_floor}`}
                                        {customer.address_floor && customer.address_apartment && " - "}
                                        {customer.address_apartment && `Depto ${customer.address_apartment}`}
                                    </p>
                                )}
                                {customer.delivery_notes && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">📝 {customer.delivery_notes}</p>
                                )}
                            </div>
                            <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </a>
                    ) : (
                        <div className="flex gap-3">
                            <div className="p-2 bg-background rounded-lg text-muted-foreground shadow-sm h-min">
                                <MapPin size={16} />
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground italic">
                                Sin dirección registrada
                            </p>
                        </div>
                    )}
                </div>

                {/* Observations */}
                <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Observaciones</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                        {customer.observations || "No hay observaciones."}
                    </p>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end pt-2 border-t border-border/50">
                    <button
                        onClick={() => onEdit(customer)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Pencil size={16} />
                        Editar Cliente
                    </button>
                </div>
            </div>
        </Dialog>
    );
}

