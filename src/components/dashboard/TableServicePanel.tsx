"use client";

import { useState, useEffect } from "react";
import { Users, Search, UserPlus, CheckCircle2, User, Clock, Loader2, Plus, X, Armchair } from "lucide-react";
import { Customer, getCustomers, upsertCustomer } from "@/lib/supabase/customer-queries";
// import { updateTableStatus, Table } from "@/lib/supabase/table-queries"; // Keep Table type if needed
import { openTableSession } from "@/lib/actions/table-actions";
import { Table } from "@/lib/supabase/table-queries"; // Only import types
import { cn } from "@/lib/utils";

interface TableServicePanelProps {
    table: any; // Using any to match Canvas object structure
    onUpdate: () => void;
    restaurantId: string;
}

export function TableServicePanel({ table, onUpdate, restaurantId }: TableServicePanelProps) {
    const [pax, setPax] = useState(2);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);

    // New Customer Form
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    // Initialize state when table changes
    useEffect(() => {
        if (table) {
            setPax(table.seats || 2);
            setSelectedCustomer(null); // In future: load from table.customer_id if occupied
            setSearchQuery("");
            setShowCreateCustomer(false);
            // If table has status/pax in DB, we should load it here.
            // Currently `table` prop comes from Canvas state which might not have deep DB fields derived yet
            // unless we mapped them in LiveFloorPlan. 
            // For now assuming fresh open.
        }
    }, [table?.id]);

    // Search Effect
    useEffect(() => {
        if (searchQuery.length > 1) {
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
    }, [searchQuery, restaurantId]);

    const handleOpenTable = async () => {
        if (!table) return;
        setLoading(true);

        const { error } = await openTableSession({
            tableId: table.id,
            restaurantId: restaurantId,
            customerId: selectedCustomer?.id || null,
            pax: pax
        });

        if (!error) {
            onUpdate();
        } else {
            console.error("Error opening table:", error);
            alert("Error al abrir la mesa: " + error);
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
        <div className="space-y-6">

            {/* Header / Status Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Armchair size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-none">{table.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {table.shape === "circle" ? "Redonda" : "Rectangular"} · {table.seats} Pers.
                    </p>
                </div>
                <div className="ml-auto px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-bold border border-green-500/20">
                    Libre
                </div>
            </div>

            {/* PAX CONTROL */}
            <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Users size={16} />
                    Comensales
                </label>
                <div className="flex items-center justify-between bg-card p-1 rounded-xl border border-border">
                    <button
                        onClick={() => setPax(Math.max(1, pax - 1))}
                        className="w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                    >
                        -
                    </button>
                    <span className="font-bold text-xl">{pax}</span>
                    <button
                        onClick={() => setPax(pax + 1)}
                        className="w-10 h-10 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* CUSTOMER SELECTOR */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <User size={16} />
                        Cliente
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
                    <div className="space-y-2">
                        {!showCreateCustomer ? (
                            <div className="relative">
                                <input
                                    placeholder="Buscar por nombre..."
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/70"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <div className="absolute left-3 top-0 bottom-0 flex items-center justify-center z-20 text-muted-foreground pointer-events-none">
                                    <Search size={16} />
                                </div>
                                {searching && (
                                    <div className="absolute right-3 top-0 bottom-0 flex items-center justify-center z-20">
                                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                                    </div>
                                )}

                                {customers.length > 0 && searchQuery.length > 1 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden max-h-[200px] overflow-y-auto">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setCustomers([]);
                                                    setSearchQuery("");
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium text-foreground">{c.first_name} {c.last_name}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        {c.phone ? c.phone : "Sin teléfono"}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowCreateCustomer(true)}
                                    className="mt-2 w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/20 flex items-center justify-center gap-1"
                                >
                                    <Plus size={12} /> Nuevo Cliente
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2 animate-in slide-in-from-left-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-muted-foreground">Nuevo Registro</span>
                                    <button onClick={() => setShowCreateCustomer(false)}><X size={14} /></button>
                                </div>
                                <input
                                    placeholder="Nombre"
                                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateCustomer}
                                    disabled={loading || !newCustomerName}
                                    className="w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold"
                                >
                                    Guardar
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl shadow-sm">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {selectedCustomer.first_name[0]}
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-sm leading-none">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{selectedCustomer.phone || "Sin teléfono"}</div>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                )}
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-4 mt-auto">
                <button
                    onClick={handleOpenTable}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground h-11 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : "Abrir Mesa"}
                </button>
            </div>
        </div>
    );
}
