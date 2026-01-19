"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { X, Plus, Trash2, Calendar, Clock, Star, AlertCircle, Loader2, LayoutTemplate as LayoutIcon } from "lucide-react";
import { DayConfiguration, upsertDayConfiguration, deleteDayConfiguration } from "@/lib/supabase/reservation-queries";
import { getLayoutTemplates, LayoutTemplate } from "@/lib/supabase/template-queries";
import { cn } from "@/lib/utils";

interface DayConfigDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    restaurantId: string | null;
    initialConfig?: DayConfiguration | null;
    onSave: () => void;
}

export function DayConfigDrawer({ isOpen, onClose, date, restaurantId, initialConfig, onSave }: DayConfigDrawerProps) {
    const [isSpecial, setIsSpecial] = useState(false);
    const [eventName, setEventName] = useState("");
    const [isClosed, setIsClosed] = useState(false);
    const [customSlots, setCustomSlots] = useState<string[]>([]);
    const [newSlot, setNewSlot] = useState("");
    const [saving, setSaving] = useState(false);

    // Floor Template Logic
    const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Load available templates
    useEffect(() => {
        if (restaurantId && isOpen) {
            getLayoutTemplates(restaurantId).then(({ data }) => {
                if (data) setTemplates(data);
            });
        }
    }, [restaurantId, isOpen]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen && initialConfig) {
            setIsSpecial(initialConfig.is_special_event);
            setEventName(initialConfig.event_name || "");
            setIsClosed(initialConfig.is_closed);
            setCustomSlots(initialConfig.custom_time_slots || []);
            setSelectedTemplateId(initialConfig.layout_template_id || null);
        } else {
            // Default blank state
            setIsSpecial(false);
            setEventName("");
            setIsClosed(false);
            setCustomSlots([]);
            setSelectedTemplateId(null);
        }
    }, [isOpen, initialConfig]);

    if (!isOpen || !date) return null;

    const handleAddSlot = () => {
        if (newSlot && !customSlots.includes(newSlot)) {
            const sorted = [...customSlots, newSlot].sort();
            setCustomSlots(sorted);
            setNewSlot("");
        }
    };

    const handleRemoveSlot = (slot: string) => {
        setCustomSlots(customSlots.filter(s => s !== slot));
    };

    const handleSave = async () => {
        if (!restaurantId) return;
        setSaving(true);

        const configToSave = {
            restaurant_id: restaurantId,
            date: format(date, "yyyy-MM-dd"),
            is_special_event: isSpecial,
            event_name: isSpecial ? eventName : null,
            custom_time_slots: isSpecial ? customSlots : null, // Only save slots if it IS a special event
            is_closed: isClosed,
            layout_template_id: selectedTemplateId // Save the selected template
        };

        const { error } = await upsertDayConfiguration(configToSave);

        if (error) {
            alert("Error al guardar configuración");
            console.error(error);
        } else {
            onSave();
            onClose();
        }
        setSaving(false);
    };

    const handleClearConfig = async () => {
        if (!confirm("¿Volver a configuración predeterminada? Se perderán los eventos de este día.") || !initialConfig || !restaurantId) return;
        setSaving(true);
        await deleteDayConfiguration(initialConfig.id);
        onSave();
        onClose();
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className={cn("absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity pointer-events-auto", isOpen ? "opacity-100" : "opacity-0")}
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className={cn(
                "w-full max-w-md bg-background h-full shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 pointer-events-auto flex flex-col",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</h2>
                        <p className="text-muted-foreground text-sm">Configuración del día</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-foreground/50 hover:text-foreground">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8 flex-1">

                    {/* Floor Template Selector - Always visible */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <LayoutIcon size={16} className="text-primary" />
                            Plantilla de Mesas
                        </label>
                        <select
                            value={selectedTemplateId || ""}
                            onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                            className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="">Predeterminado (Según Restaurante)</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">Define qué distribución de mesas se usará este día.</p>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Status Toggles */}
                    <div className="space-y-4">
                        <div
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                                isClosed ? "bg-destructive/10 border-destructive/30" : "bg-card border-border hover:border-primary/50"
                            )}
                            onClick={() => {
                                setIsClosed(!isClosed);
                                if (!isClosed) setIsSpecial(false); // Can't be special and closed
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", isClosed ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")}>
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold">Cerrado</h3>
                                    <p className="text-xs text-muted-foreground">No aceptar reservas este día.</p>
                                </div>
                            </div>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", isClosed ? "border-destructive bg-destructive" : "border-muted-foreground")}>
                                {isClosed && <X size={14} className="text-white" />}
                            </div>
                        </div>

                        <div
                            className={cn(
                                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                                isSpecial ? "bg-amber-500/10 border-amber-500/30" : "bg-card border-border hover:border-primary/50",
                                isClosed && "opacity-50 pointer-events-none grayscale"
                            )}
                            onClick={() => {
                                setIsSpecial(!isSpecial);
                                if (!isSpecial) setIsClosed(false);
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", isSpecial ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground")}>
                                    <Star size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold">Evento Especial</h3>
                                    <p className="text-xs text-muted-foreground">Horarios personalizados (ej. Sushi Libre).</p>
                                </div>
                            </div>
                            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", isSpecial ? "border-amber-500 bg-amber-500" : "border-muted-foreground")}>
                                {isSpecial && <X size={14} className="text-white rotate-45" />}
                            </div>
                        </div>
                    </div>

                    {/* Event Details Form */}
                    {isSpecial && !isClosed && (
                        <div className="space-y-6 animate-in slide-in-from-right-5 fade-in duration-300">
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">Nombre del Evento</label>
                                    <input
                                        type="text"
                                        placeholder="Ej. Noche de Tacos"
                                        value={eventName}
                                        onChange={(e) => setEventName(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-foreground flex items-center justify-between">
                                        <span>Horarios / Turnos</span>
                                        <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                                            Sobrescribe los intervalos regulares
                                        </span>
                                    </label>

                                    <div className="flex gap-2">
                                        <input
                                            type="time"
                                            value={newSlot}
                                            onChange={(e) => setNewSlot(e.target.value)}
                                            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                        <button
                                            onClick={handleAddSlot}
                                            disabled={!newSlot}
                                            className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {customSlots.length === 0 ? (
                                            <p className="text-sm text-muted-foreground italic text-center py-4">No hay horarios definidos.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {customSlots.map((slot) => (
                                                    <div key={slot} className="flex items-center gap-2 bg-background border border-amber-200 text-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                                                        <Clock size={14} className="text-amber-500" />
                                                        {slot} hs
                                                        <button onClick={() => handleRemoveSlot(slot)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-border flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 className="animate-spin" size={20} />}
                        Guardar Configuración
                    </button>

                    {initialConfig && (
                        <button
                            onClick={handleClearConfig}
                            disabled={saving}
                            className="w-full text-muted-foreground hover:text-destructive font-medium py-3 rounded-xl hover:bg-destructive/5 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} />
                            Restaurar a día normal
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
