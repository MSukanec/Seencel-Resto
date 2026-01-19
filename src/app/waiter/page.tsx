"use client";

import { useState, useEffect } from "react";
import {
    ClipboardList,
    Users,
    Clock,
    Plus,
    CircleDot,
    Map,
    LayoutGrid,
    Loader2
} from "lucide-react";
import { FloorViewCanvas } from "@/features/floor-plan";
import { getFloorsForRestaurant } from "@/lib/supabase/floor-queries";
import { getTables, Table } from "@/lib/supabase/table-queries";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
    available: "bg-emerald-500/20 border-emerald-500/50 text-emerald-500",
    occupied: "bg-blue-500/20 border-blue-500/50 text-blue-500",
    reserved: "bg-purple-500/20 border-purple-500/50 text-purple-500",
    blocked: "bg-red-500/20 border-red-500/50 text-red-500",
};

const STATUS_LABELS = {
    available: "Disponible",
    occupied: "Ocupada",
    reserved: "Reservada",
    blocked: "Bloqueada",
};

type ViewMode = "map" | "cards";

export default function MozoPage() {
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("map");
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        if (match) {
            const id = match[2];
            setRestaurantId(id);
            fetchTables(id);
        }
    }, []);

    const fetchTables = async (restId: string) => {
        setLoading(true);
        try {
            // Get floors first
            const { data: floors } = await getFloorsForRestaurant(restId);
            if (floors && floors.length > 0) {
                // Get tables from all floors
                const allTables: Table[] = [];
                for (const floor of floors) {
                    const { data: floorTables } = await getTables(floor.id);
                    if (floorTables) {
                        allTables.push(...floorTables);
                    }
                }
                setTables(allTables);
            }
        } catch (error) {
            console.error("Error fetching tables:", error);
        }
        setLoading(false);
    };

    // Calculate stats from real data
    const occupiedTables = tables.filter(t => t.status === "occupied");
    const totalGuests = occupiedTables.reduce((sum, t) => sum + (t.current_pax || 0), 0);
    const activeOrders = occupiedTables.length; // Simplified: 1 order per occupied table

    const calculateElapsedTime = (openedAt: string | undefined) => {
        if (!openedAt) return null;
        const opened = new Date(openedAt);
        const now = new Date();
        const diffMs = now.getTime() - opened.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins} min`;
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with view toggle */}
            <div className="p-4 border-b border-border bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold">Mesas</h1>

                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center gap-4 ml-4">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                <ClipboardList size={14} />
                            </div>
                            <span className="font-bold">{activeOrders}</span>
                            <span className="text-muted-foreground">mesas activas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Users size={14} />
                            </div>
                            <span className="font-bold">{totalGuests}</span>
                            <span className="text-muted-foreground">comensales</span>
                        </div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setViewMode("map")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            viewMode === "map"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Map size={16} />
                        Mapa
                    </button>
                    <button
                        onClick={() => setViewMode("cards")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                            viewMode === "cards"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <LayoutGrid size={16} />
                        Tarjetas
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === "map" ? (
                    // MAP VIEW - Identical to Panel
                    restaurantId ? (
                        <FloorViewCanvas restaurantId={restaurantId} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="animate-spin mr-2" size={20} />
                            Cargando mapa...
                        </div>
                    )
                ) : (
                    // CARDS VIEW with real data
                    <div className="p-4 space-y-4 h-full overflow-auto">
                        {/* Mobile Quick Stats */}
                        <div className="grid grid-cols-3 gap-3 md:hidden">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <ClipboardList size={18} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{activeOrders}</p>
                                    <p className="text-[10px] text-muted-foreground">Activas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{totalGuests}</p>
                                    <p className="text-[10px] text-muted-foreground">Comensales</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                    <LayoutGrid size={18} />
                                </div>
                                <div>
                                    <p className="text-xl font-bold">{tables.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Mesas</p>
                                </div>
                            </div>
                        </div>

                        {/* Tables Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold">Mis Mesas</h2>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1.5">
                                        <CircleDot size={12} className="text-emerald-500" /> Disponible
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <CircleDot size={12} className="text-blue-500" /> Ocupada
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <CircleDot size={12} className="text-purple-500" /> Reservada
                                    </span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="animate-spin text-muted-foreground" size={32} />
                                </div>
                            ) : tables.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No hay mesas configuradas
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {tables.map((table) => {
                                        const status = table.status || "available";
                                        const elapsed = calculateElapsedTime(table.opened_at);

                                        return (
                                            <button
                                                key={table.id}
                                                onClick={() => setSelectedTableId(table.id)}
                                                className={cn(
                                                    "relative p-4 rounded-xl border-2 transition-all hover:scale-105",
                                                    STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.available,
                                                    selectedTableId === table.id && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                                                )}
                                            >
                                                <div className="text-3xl font-bold mb-2">
                                                    {table.label}
                                                </div>
                                                <div className="text-xs opacity-80">
                                                    {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || "Disponible"}
                                                </div>
                                                {table.current_pax && table.current_pax > 0 && (
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs">
                                                        <Users size={12} />
                                                        {table.current_pax}
                                                    </div>
                                                )}
                                                {elapsed && (
                                                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs opacity-70">
                                                        <Clock size={12} />
                                                        {elapsed}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Button */}
            <button className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl transition-all hover:scale-105 z-50">
                <Plus size={20} />
                <span className="font-semibold">Nueva Comanda</span>
            </button>
        </div>
    );
}
