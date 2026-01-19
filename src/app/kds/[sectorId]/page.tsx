"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Clock, ChefHat, CheckCircle2, Timer, AlertCircle, Loader2, RefreshCw, Truck, ShoppingBag, UtensilsCrossed, ArrowLeft, X, BookOpen } from "lucide-react";
import { getKitchenOrders, updateOrderItemStatus, checkAndUpdateOrderReadyStatus } from "@/lib/actions/order-actions";
import { KitchenOrder, KitchenOrderItem } from "@/types/order";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Sector {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
}

interface RecipeInfo {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    recipe: string | null;
}

const STATUS_CONFIG = {
    pending: {
        label: "Pendiente",
        color: "border-amber-500/50 bg-amber-500/5",
        headerColor: "bg-amber-500",
        icon: AlertCircle,
    },
    preparing: {
        label: "En Preparación",
        color: "border-blue-500/50 bg-blue-500/5",
        headerColor: "bg-blue-500",
        icon: Timer,
    },
    ready: {
        label: "Listo",
        color: "border-emerald-500/50 bg-emerald-500/5",
        headerColor: "bg-emerald-500",
        icon: CheckCircle2,
    },
};

const ORDER_TYPE_ICONS = {
    "dine-in": UtensilsCrossed,
    "pickup": ShoppingBag,
    "delivery": Truck,
};

const ORDER_TYPE_LABELS = {
    "dine-in": "Local",
    "pickup": "Retiro",
    "delivery": "Delivery",
};

export default function KDSPage() {
    const params = useParams();
    const sectorId = params.sectorId as string;
    const supabase = createClient();

    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [sector, setSector] = useState<Sector | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Recipe modal state
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeInfo | null>(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);

    const getRestaurantId = () => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    const restaurantId = getRestaurantId();

    // Fetch sector info
    useEffect(() => {
        const fetchSector = async () => {
            const { data } = await supabase
                .from("kitchen_sectors")
                .select("id, name, color, icon")
                .eq("id", sectorId)
                .single();

            if (data) {
                setSector(data);
            }
        };

        if (sectorId) {
            fetchSector();
        }
    }, [sectorId]);

    const fetchOrders = useCallback(async (showRefreshing = false) => {
        if (!restaurantId) return;

        if (showRefreshing) setRefreshing(true);

        const data = await getKitchenOrders(restaurantId, sectorId);
        setOrders(data);

        setLoading(false);
        setRefreshing(false);
    }, [restaurantId, sectorId]);

    useEffect(() => {
        if (restaurantId) {
            fetchOrders();

            // Auto-refresh every 10 seconds
            const interval = setInterval(() => fetchOrders(), 10000);
            return () => clearInterval(interval);
        }
    }, [restaurantId, fetchOrders]);

    // Fetch recipe for an item
    const handleItemClick = async (item: KitchenOrderItem) => {
        setLoadingRecipe(true);

        // We need to find the menu_item_id from order_items
        const { data: orderItem } = await supabase
            .from("order_items")
            .select("menu_item_id")
            .eq("id", item.id)
            .single();

        if (orderItem?.menu_item_id) {
            const { data: menuItem } = await supabase
                .from("menu_items")
                .select("id, name, description, image_url, recipe")
                .eq("id", orderItem.menu_item_id)
                .single();

            if (menuItem) {
                setSelectedRecipe(menuItem);
            }
        }

        setLoadingRecipe(false);
    };

    // Group items by status across all orders
    const getOrderStatus = (order: KitchenOrder): "pending" | "preparing" | "ready" => {
        const items = order.items;
        if (items.length === 0) return "pending";

        const allReady = items.every(i => i.status === "ready" || i.status === "delivered");
        const anyPreparing = items.some(i => i.status === "preparing");
        const anyReady = items.some(i => i.status === "ready");

        if (allReady) return "ready";
        if (anyPreparing || anyReady) return "preparing";
        return "pending";
    };

    const ordersByStatus = {
        pending: orders.filter(o => getOrderStatus(o) === "pending"),
        preparing: orders.filter(o => getOrderStatus(o) === "preparing"),
        ready: orders.filter(o => getOrderStatus(o) === "ready"),
    };

    const handleStartOrder = async (order: KitchenOrder) => {
        // Mark all pending items as preparing
        const pendingItems = order.items.filter(i => i.status === "pending");

        for (const item of pendingItems) {
            await updateOrderItemStatus(item.id, "preparing");
        }

        await fetchOrders();
    };

    const handleMarkReady = async (order: KitchenOrder) => {
        // Mark all preparing items as ready
        const preparingItems = order.items.filter(i => i.status === "preparing");

        for (const item of preparingItems) {
            await updateOrderItemStatus(item.id, "ready");
        }

        await checkAndUpdateOrderReadyStatus(order.id);
        await fetchOrders();
    };

    const handleDeliver = async (order: KitchenOrder) => {
        // Mark all ready items as delivered
        const readyItems = order.items.filter(i => i.status === "ready");

        for (const item of readyItems) {
            await updateOrderItemStatus(item.id, "delivered");
        }

        await fetchOrders();
    };

    const formatElapsed = (minutes: number): string => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/modes"
                        className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: sector?.color ? `${sector.color}20` : undefined }}
                            >
                                <ChefHat size={18} style={{ color: sector?.color || undefined }} />
                            </div>
                            {sector?.name || "Estación"}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {orders.length} comandas activas
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchOrders(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
                    Actualizar
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <div className="p-6 rounded-full bg-muted mb-4">
                        <ChefHat size={48} className="text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold">Sin comandas</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mt-1">
                        No hay pedidos pendientes en esta estación.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
                    {(["pending", "preparing", "ready"] as const).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const StatusIcon = config.icon;

                        return (
                            <div key={status} className="flex flex-col">
                                {/* Column Header */}
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-t-xl ${config.headerColor} text-white`}>
                                    <StatusIcon size={18} />
                                    <span className="font-semibold">{config.label}</span>
                                    <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                        {ordersByStatus[status].length}
                                    </span>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 overflow-auto space-y-3 p-3 bg-card/30 border border-t-0 border-border rounded-b-xl">
                                    {ordersByStatus[status].map((order) => {
                                        const TypeIcon = ORDER_TYPE_ICONS[order.order_type];
                                        const isUrgent = order.elapsed_minutes > 15 && status !== "ready";

                                        return (
                                            <div
                                                key={order.id}
                                                className={cn(
                                                    "p-4 rounded-lg border-2 transition-all hover:scale-[1.02]",
                                                    config.color,
                                                    isUrgent && "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
                                                )}
                                            >
                                                {/* Order Header */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg">
                                                            #{order.order_number}
                                                        </span>
                                                        {order.table_label && (
                                                            <span className="text-sm text-muted-foreground">
                                                                • {order.table_label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <TypeIcon size={14} />
                                                            {ORDER_TYPE_LABELS[order.order_type]}
                                                        </div>
                                                        <div className={cn(
                                                            "flex items-center gap-1 text-xs",
                                                            isUrgent ? "text-red-500 font-bold" : "text-muted-foreground"
                                                        )}>
                                                            <Clock size={12} />
                                                            {formatElapsed(order.elapsed_minutes)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Customer Name */}
                                                {order.customer_name && (
                                                    <p className="text-xs text-muted-foreground mb-2">
                                                        {order.customer_name}
                                                    </p>
                                                )}

                                                {/* Items - Clickable for recipe */}
                                                <div className="space-y-2 mb-4">
                                                    {order.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-start gap-2 cursor-pointer hover:bg-background/50 rounded p-1 -mx-1 transition-colors"
                                                            onClick={() => handleItemClick(item)}
                                                        >
                                                            <span className="font-medium text-sm bg-background/50 px-1.5 py-0.5 rounded">
                                                                x{item.quantity}
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className="text-lg font-semibold hover:text-primary transition-colors">
                                                                    {item.name}
                                                                    {item.variant && (
                                                                        <span className="text-muted-foreground font-normal text-base"> ({item.variant})</span>
                                                                    )}
                                                                    <BookOpen size={14} className="inline ml-2 text-muted-foreground" />
                                                                </p>
                                                                {item.notes && (
                                                                    <p className="text-xs text-amber-500 font-medium">
                                                                        ⚠️ {item.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2">
                                                    {status === "pending" && (
                                                        <button
                                                            onClick={() => handleStartOrder(order)}
                                                            className="flex-1 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                                        >
                                                            Comenzar
                                                        </button>
                                                    )}
                                                    {status === "preparing" && (
                                                        <button
                                                            onClick={() => handleMarkReady(order)}
                                                            className="flex-1 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                                        >
                                                            Marcar Listo
                                                        </button>
                                                    )}
                                                    {status === "ready" && (
                                                        <button
                                                            onClick={() => handleDeliver(order)}
                                                            className="flex-1 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                                                        >
                                                            Entregar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {ordersByStatus[status].length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                            <StatusIcon size={32} className="opacity-30 mb-2" />
                                            <p className="text-sm">Sin comandas</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recipe Modal */}
            {(selectedRecipe || loadingRecipe) && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 border shadow-2xl">
                        {loadingRecipe ? (
                            <div className="p-12 flex items-center justify-center">
                                <Loader2 className="animate-spin text-primary" size={32} />
                            </div>
                        ) : selectedRecipe && (
                            <>
                                {/* Image */}
                                {selectedRecipe.image_url ? (
                                    <div className="h-48 relative">
                                        <img
                                            src={selectedRecipe.image_url}
                                            alt={selectedRecipe.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                                        <button
                                            onClick={() => setSelectedRecipe(null)}
                                            className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white backdrop-blur-sm"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-32 bg-muted flex items-center justify-center relative">
                                        <UtensilsCrossed size={40} className="text-muted-foreground/30" />
                                        <button
                                            onClick={() => setSelectedRecipe(null)}
                                            className="absolute top-3 right-3 p-2 bg-muted-foreground/10 rounded-full"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <BookOpen size={22} className="text-primary" />
                                            {selectedRecipe.name}
                                        </h2>
                                        {selectedRecipe.description && (
                                            <p className="text-muted-foreground mt-2">
                                                {selectedRecipe.description}
                                            </p>
                                        )}
                                    </div>

                                    {selectedRecipe.recipe ? (
                                        <div className="border-t pt-4">
                                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                                <ChefHat size={16} className="text-primary" />
                                                Receta / Preparación
                                            </h3>
                                            <div
                                                className="recipe-content bg-muted/20 rounded-xl p-4 border border-border [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_strong]:font-bold [&_b]:font-bold"
                                                dangerouslySetInnerHTML={{ __html: selectedRecipe.recipe }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="border-t pt-4 text-center text-muted-foreground py-8">
                                            <ChefHat size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">No hay receta cargada para este plato.</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setSelectedRecipe(null)}
                                        className="w-full py-3 bg-muted hover:bg-muted/80 rounded-xl font-medium transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
