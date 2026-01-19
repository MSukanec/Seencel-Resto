"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    CheckCircle2,
    Clock,
    Receipt,
    UtensilsCrossed,
    ShoppingBag,
    Truck,
    Home,
    ChefHat,
    Loader2,
    AlertCircle
} from "lucide-react";
import { useOrderContext } from "../layout";
import { createOrder } from "@/lib/actions/order-actions";
import { cn } from "@/lib/utils";

interface CartItemData {
    id: string;
    name: string;
    quantity: number;
    price: number;
    sector_id?: string;
}

export default function ConfirmationPage() {
    const router = useRouter();
    const params = useParams();
    const restaurantId = params.restaurantId as string;
    const { restaurant } = useOrderContext();

    const [orderNumber, setOrderNumber] = useState<number | null>(null);
    const [orderType, setOrderType] = useState<string>("");
    const [items, setItems] = useState<CartItemData[]>([]);
    const [total, setTotal] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [discount, setDiscount] = useState(0);

    const [creating, setCreating] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Prevent double execution in React Strict Mode
    const hasCreatedOrder = useRef(false);

    useEffect(() => {
        if (hasCreatedOrder.current) return;
        hasCreatedOrder.current = true;
        createOrderFromCart();
    }, []);

    const createOrderFromCart = async () => {
        // Get order info from session storage
        const type = sessionStorage.getItem("order_type") || "dine-in";
        const cartData = sessionStorage.getItem("order_cart");
        const savedDiscount = sessionStorage.getItem("order_discount");
        const guestName = sessionStorage.getItem("order_guest_name");
        const guestPhone = sessionStorage.getItem("order_guest_phone");

        setOrderType(type);

        if (!cartData) {
            setError("No se encontró información del carrito");
            setCreating(false);
            return;
        }

        try {
            const cart = JSON.parse(cartData);
            setItems(cart.items || []);
            setTotal(cart.total || 0);
            setSubtotal(cart.subtotal || 0);
            setDiscount(parseFloat(savedDiscount || "0"));

            // Create the order in the database
            const result = await createOrder({
                restaurant_id: restaurantId,
                order_type: type as "dine-in" | "pickup" | "delivery",
                discount_percent: parseFloat(savedDiscount || "0"),
                guest_name: guestName || undefined,
                guest_phone: guestPhone || undefined,
                items: cart.items.map((item: CartItemData) => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    sector_id: item.sector_id,
                })),
            });

            if (result.success && result.order) {
                setOrderNumber(result.order.order_number);

                // Clear session storage
                sessionStorage.removeItem("order_cart");
                sessionStorage.removeItem("order_discount");
                sessionStorage.removeItem("order_type");
                sessionStorage.removeItem("order_guest_name");
                sessionStorage.removeItem("order_guest_phone");
            } else {
                setError(result.error || "Error al crear el pedido");
            }
        } catch (err: any) {
            console.error("Error creating order:", err);
            setError(err.message || "Error al procesar el pedido");
        } finally {
            setCreating(false);
        }
    };

    const orderTypeInfo = {
        "dine-in": {
            icon: UtensilsCrossed,
            label: "En el Local",
            message: "Tu pedido será servido en tu mesa"
        },
        "pickup": {
            icon: ShoppingBag,
            label: "Para Retirar",
            message: "Te avisaremos cuando esté listo para retirar"
        },
        "delivery": {
            icon: Truck,
            label: "Delivery",
            message: "Tu pedido está en camino"
        },
    };

    const typeInfo = orderTypeInfo[orderType as keyof typeof orderTypeInfo] || orderTypeInfo["dine-in"];
    const TypeIcon = typeInfo.icon;

    // Loading state
    if (creating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="animate-spin text-white/50 mb-4" size={48} />
                <p className="text-white/60">Procesando tu pedido...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-6">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle size={40} className="text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
                <p className="text-white/60 text-center mb-6">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium"
                >
                    Volver al menú
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
            {/* Success Animation Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
                <div className="w-full max-w-md space-y-8 text-center">
                    {/* Success Icon */}
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                            <CheckCircle2 size={48} className="text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            ¡Pedido Confirmado!
                        </h1>
                        <p className="text-white/60">
                            {typeInfo.message}
                        </p>
                    </div>

                    {/* Order Number */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                        <div className="text-sm text-white/40 uppercase tracking-wider mb-1">
                            Número de Pedido
                        </div>
                        <div className="text-4xl font-bold text-white tracking-widest">
                            #{orderNumber}
                        </div>
                    </div>

                    {/* Order Type Badge */}
                    <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/10">
                        <TypeIcon size={20} className="text-white/60" />
                        <span className="text-white font-medium">{typeInfo.label}</span>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 text-left">
                        <div className="flex items-center gap-2 mb-4">
                            <Receipt size={18} className="text-white/40" />
                            <span className="text-sm font-medium text-white/60 uppercase tracking-wider">
                                Resumen
                            </span>
                        </div>

                        <div className="space-y-3 mb-4">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="text-white">
                                        <span className="text-white/40 mr-2">{item.quantity}x</span>
                                        {item.name}
                                    </div>
                                    <div className="text-white/60">
                                        ${(item.price * item.quantity).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-white font-medium">Total</span>
                            <span className="text-2xl font-bold text-white">
                                ${total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Preparation Status */}
                    <div className="flex items-center justify-center gap-3 text-white/60">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <ChefHat size={18} />
                        <span className="text-sm">Preparando tu pedido...</span>
                    </div>

                    {/* Back to Home */}
                    <button
                        onClick={() => router.push(`/order/${restaurantId}`)}
                        className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white py-4 rounded-2xl font-medium transition-all border border-white/10"
                    >
                        <Home size={18} />
                        Volver al Inicio
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 text-center text-xs text-white/30">
                Gracias por tu compra en <span className="font-semibold text-white/50">{restaurant?.name}</span>
            </div>
        </div>
    );
}
