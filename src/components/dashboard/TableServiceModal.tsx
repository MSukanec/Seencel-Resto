"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Users, Search, UserPlus, CheckCircle2, User, Clock, Loader2, Plus, X } from "lucide-react";
import { Customer, getCustomers, upsertCustomer } from "@/lib/supabase/customer-queries";
import { updateTableStatus, Table } from "@/lib/supabase/table-queries";
import { cn } from "@/lib/utils";

interface TableServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: any; // Using any for now to avoid strict type conflicts with Canvas object vs DB Table
    onUpdate: () => void;
    restaurantId: string;
}

export function TableServiceModal({ isOpen, onClose, table, onUpdate, restaurantId }: TableServiceModalProps) {
    const [step, setStep] = useState<"pax" | "customer">("pax");
    const [pax, setPax] = useState(2);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);

    // Customer Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);

    // New Customer Form
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    // Initialize
    useEffect(() => {
        if (isOpen && table) {
            setPax(table.seats || 2);
            setStep("pax");
            setSelectedCustomer(null);
            setSearchQuery("");
            setShowCreateCustomer(false);
        }
    }, [isOpen, table]);

    // Search Customers
    useEffect(() => {
        if (step === "customer" && searchQuery.length > 1) {
            const delayDebounceFn = setTimeout(async () => {
                setSearching(true);
                const { data } = await getCustomers(restaurantId);
                if (data) {
                    const filtered = data.filter(c =>
                        (c.first_name + " " + (c.last_name || "")).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.phone?.includes(searchQuery)
                    ).slice(0, 5);
                    setCustomers(filtered);
                }
                setSearching(false);
            }, 300);

            return () => clearTimeout(delayDebounceFn);
        } else {
            setCustomers([]);
        }
    }, [searchQuery, restaurantId, step]);

    const handleOpenTable = async () => {
        if (!table) return;
        setLoading(true);

        const payload = {
            status: "occupied" as const,
            current_pax: pax,
            customer_id: selectedCustomer?.id || null,
            opened_at: new Date().toISOString()
        };

        const { error } = await updateTableStatus(table.id, payload);

        if (!error) {
            onUpdate();
            onClose();
        } else {
            alert("Error al abrir la mesa");
        }
        setLoading(false);
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName) return;
        setLoading(true);
        const [first, ...last] = newCustomerName.split(" ");

        const { data, error } = await upsertCustomer({
            restaurant_id: restaurantId,
            first_name: first,
            last_name: last.join(" "),
            phone: newCustomerPhone
        });

        if (data && !error) {
            setSelectedCustomer(data);
            setShowCreateCustomer(false);
            setSearchQuery("");
        }
        setLoading(false);
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Mesa ${table?.label || ''}`}
        >
            <div className="space-y-6 pt-2">

                {/* STATUS INDICATOR */}
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-sm font-medium">Disponible</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        <span>--:--</span>
                    </div>
                </div>

                {/* PAX SELECTION */}
                <div className={cn("space-y-3 transition-opacity duration-300", step !== "pax" && "opacity-50 pointer-events-none")}>
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Users size={16} className="text-primary" />
                        Cantidad de Personas
                    </label>
                    <div className="flex items-center gap-4 justify-center bg-card p-4 rounded-xl border border-border shadow-sm">
                        <button
                            onClick={() => setPax(Math.max(1, pax - 1))}
                            className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-xl font-bold transition-colors"
                        >
                            -
                        </button>
                        <div className="text-4xl font-bold w-12 text-center text-primary">{pax}</div>
                        <button
                            onClick={() => setPax(pax + 1)}
                            className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center text-xl font-bold transition-colors shadow-lg shadow-primary/20"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* CUSTOMER SELECTION */}
                <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <User size={16} className="text-primary" />
                            Cliente (Opcional)
                        </label>
                        {selectedCustomer && (
                            <button
                                onClick={() => setSelectedCustomer(null)}
                                className="text-xs text-destructive hover:underline"
                            >
                                Quitar
                            </button>
                        )}
                    </div>

                    {!selectedCustomer ? (
                        <div className="relative">
                            {!showCreateCustomer ? (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                        <input
                                            placeholder="Buscar cliente..."
                                            className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setStep("customer");
                                            }}
                                            onFocus={() => setStep("customer")}
                                        />
                                        {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                                    </div>

                                    {/* Results Dropdown */}
                                    {searchQuery.length > 1 && customers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                                            {customers.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setCustomers([]);
                                                        setSearchQuery("");
                                                    }}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 text-left"
                                                >
                                                    <div>
                                                        <div className="font-semibold text-sm">{c.first_name} {c.last_name}</div>
                                                        <div className="text-xs text-muted-foreground">{c.phone || "Sin teléfono"}</div>
                                                    </div>
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {c.first_name[0]}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick Create Button */}
                                    <button
                                        onClick={() => setShowCreateCustomer(true)}
                                        className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-primary/30"
                                    >
                                        <Plus size={14} /> Crear "{searchQuery || 'Nuevo'}"
                                    </button>
                                </>
                            ) : (
                                <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground">Nuevo Cliente</span>
                                        <button onClick={() => setShowCreateCustomer(false)}><X size={14} /></button>
                                    </div>
                                    <input
                                        placeholder="Nombre completo"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                        value={newCustomerName}
                                        onChange={(e) => setNewCustomerName(e.target.value)}
                                        autoFocus
                                    />
                                    <input
                                        placeholder="Teléfono (Opcional)"
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                                        value={newCustomerPhone}
                                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                                    />
                                    <button
                                        onClick={handleCreateCustomer}
                                        disabled={loading || !newCustomerName}
                                        className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Guardar Cliente"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                                {selectedCustomer.first_name[0]}
                            </div>
                            <div>
                                <div className="font-bold text-sm">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                                <div className="text-xs text-muted-foreground">{selectedCustomer.phone || "Cliente VIP"}</div>
                            </div>
                            <CheckCircle2 size={18} className="text-primary ml-auto" />
                        </div>
                    )}
                </div>

                {/* ACTION BUTTON */}
                <button
                    onClick={handleOpenTable}
                    disabled={loading}
                    className="w-full mt-6 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Abrir Mesa"}
                </button>
            </div>
        </Dialog>
    );
}
