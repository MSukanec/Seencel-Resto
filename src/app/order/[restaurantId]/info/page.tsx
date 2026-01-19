"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    Store,
    MapPin,
    Navigation,
    UtensilsCrossed,
    ShoppingBag,
    Truck,
    ArrowLeft,
    Check,
    X,
    Percent,
    CalendarDays,
    Sparkles
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrderContext } from "../layout";
import { cn } from "@/lib/utils";

interface RestaurantDetails {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
    address: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
}

interface TodaySchedule {
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
}

interface OrderSettings {
    dine_in_discount: number;
    dine_in_discount_label: string | null;
    pickup_discount: number;
    pickup_discount_label: string | null;
    delivery_discount: number;
    delivery_discount_label: string | null;
}

export default function RestaurantInfoPage() {
    const router = useRouter();
    const params = useParams();
    const restaurantId = params.restaurantId as string;
    const { restaurant } = useOrderContext();

    const [details, setDetails] = useState<RestaurantDetails | null>(null);
    const [settings, setSettings] = useState<OrderSettings | null>(null);
    const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState<boolean | null>(null);

    useEffect(() => {
        fetchDetails();
        fetchSettings();
        fetchTodaySchedule();
    }, []);

    const fetchDetails = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from("restaurants")
            .select("id, name, logo_url, description, address, phone, latitude, longitude")
            .eq("id", restaurantId)
            .single();

        if (data) {
            setDetails(data);
            if (data.latitude && data.longitude) {
                getUserLocation(data.latitude, data.longitude);
            }
        }
    };

    const fetchSettings = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from("restaurant_settings")
            .select("dine_in_discount, dine_in_discount_label, pickup_discount, pickup_discount_label, delivery_discount, delivery_discount_label")
            .eq("restaurant_id", restaurantId)
            .single();

        if (data) {
            setSettings(data);
        }
    };

    const fetchTodaySchedule = async () => {
        const supabase = createClient();
        const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

        const { data } = await supabase
            .from("operating_schedules")
            .select("open_time, close_time, is_closed")
            .eq("restaurant_id", restaurantId)
            .eq("day_of_week", dayOfWeek)
            .single();

        if (data) {
            setTodaySchedule(data);

            if (data.is_closed) {
                setIsOpen(false);
            } else {
                checkIfOpen(data.open_time, data.close_time);
            }
        } else {
            // No schedule found, assume open
            setIsOpen(true);
        }
    };

    const checkIfOpen = (openTime: string | null, closeTime: string | null) => {
        if (!openTime || !closeTime) {
            setIsOpen(true);
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [openH, openM] = openTime.split(":").map(Number);
        const [closeH, closeM] = closeTime.split(":").map(Number);

        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (closeMinutes < openMinutes) {
            // Closes after midnight
            setIsOpen(currentMinutes >= openMinutes || currentMinutes < closeMinutes);
        } else {
            setIsOpen(currentMinutes >= openMinutes && currentMinutes < closeMinutes);
        }
    };

    const getUserLocation = (restLat: number, restLon: number) => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const dist = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    restLat,
                    restLon
                );
                setDistance(dist);
            },
            () => { }
        );
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const formatTime = (time: string | null) => {
        if (!time) return "";
        const [h, m] = time.split(":");
        const hour = parseInt(h);
        return `${hour}:${m}`;
    };

    const handleOrderType = (type: "dine-in" | "pickup" | "delivery", discount: number) => {
        sessionStorage.setItem("order_type", type);
        sessionStorage.setItem("order_discount", discount.toString());
        router.push(`/order/${restaurantId}/menu`);
    };

    const getDiscountForType = (type: "dine-in" | "pickup" | "delivery"): number => {
        if (!settings) return 0;
        switch (type) {
            case "dine-in": return settings.dine_in_discount || 0;
            case "pickup": return settings.pickup_discount || 0;
            case "delivery": return settings.delivery_discount || 0;
            default: return 0;
        }
    };

    const getLabelForType = (type: "dine-in" | "pickup" | "delivery"): string | null => {
        if (!settings) return null;
        switch (type) {
            case "dine-in": return settings.dine_in_discount_label;
            case "pickup": return settings.pickup_discount_label;
            case "delivery": return settings.delivery_discount_label;
            default: return null;
        }
    };

    const orderTypes = [
        {
            id: "dine-in" as const,
            icon: UtensilsCrossed,
            title: "Estoy en el Local",
            description: "Pedí desde tu mesa",
        },
        {
            id: "pickup" as const,
            icon: ShoppingBag,
            title: "Para Retirar",
            description: "Pasás a buscarlo",
        },
        {
            id: "delivery" as const,
            icon: Truck,
            title: "Envío a Domicilio",
            description: "Te lo llevamos",
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-white truncate">{details?.name || restaurant?.name}</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Restaurant Hero with Banner */}
                <div className="relative">
                    {/* Banner Image or Gradient */}
                    {restaurant?.banner_url ? (
                        <div className="h-40 relative overflow-hidden">
                            <img
                                src={restaurant.banner_url}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                        </div>
                    ) : (
                        <div className="h-24 bg-gradient-to-b from-white/5 to-transparent" />
                    )}

                    <div className={cn(
                        "px-6 relative z-10",
                        restaurant?.banner_url ? "-mt-16" : "-mt-12"
                    )}>
                        <div className="flex items-end gap-4">
                            {restaurant?.logo_url ? (
                                <img
                                    src={restaurant.logo_url}
                                    alt={details?.name || ""}
                                    className="w-24 h-24 rounded-2xl object-cover shadow-2xl border-2 border-white/20"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center shadow-2xl border border-white/10">
                                    <Store size={40} className="text-white/40" />
                                </div>
                            )}
                            <div className="flex-1 pb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-2xl font-bold text-white">{details?.name}</h2>
                                    {/* Status chip with hours */}
                                    {isOpen !== null && (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1",
                                            isOpen
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-red-500/20 text-red-400"
                                        )}>
                                            {isOpen ? <Check size={10} /> : <X size={10} />}
                                            {isOpen ? "Abierto" : "Cerrado"}
                                            {todaySchedule && !todaySchedule.is_closed && todaySchedule.open_time && (
                                                <span className="text-white/40 ml-1">
                                                    {formatTime(todaySchedule.open_time)}-{formatTime(todaySchedule.close_time)}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {details?.description && (
                                    <p className="text-white/40 text-sm mt-1 line-clamp-1">
                                        {details.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Cards - Compact */}
                <div className="px-6 py-2">
                    <div className="flex gap-2 flex-wrap">
                        {distance !== null && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                <Navigation size={14} className="text-white/50" />
                                <span className="text-xs font-medium text-white/70">
                                    {distance < 1
                                        ? `${Math.round(distance * 1000)} m`
                                        : `${distance.toFixed(1)} km`
                                    }
                                </span>
                            </div>
                        )}
                        {details?.address && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex-1 min-w-0">
                                <MapPin size={14} className="text-white/50 flex-shrink-0" />
                                <span className="text-xs text-white/60 truncate">{details.address}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Order Type Selection */}
                <div className="px-6 py-4">
                    <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                        ¿Cómo querés tu pedido?
                    </h3>
                    <div className="space-y-2">
                        {orderTypes.map((type) => {
                            const discount = getDiscountForType(type.id);
                            const label = getLabelForType(type.id);
                            const hasDiscount = discount > 0;
                            const hasSurcharge = discount < 0;

                            return (
                                <button
                                    key={type.id}
                                    onClick={() => handleOrderType(type.id, discount)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all group relative overflow-hidden",
                                        hasDiscount
                                            ? "bg-[#f05526]/10 border-[#f05526]/30 hover:bg-[#f05526]/15"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                    )}
                                >
                                    {/* Discount Badge */}
                                    {(hasDiscount || hasSurcharge) && (
                                        <div className={cn(
                                            "absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-xs font-bold",
                                            hasDiscount ? "bg-[#f05526] text-white" : "bg-amber-500 text-black"
                                        )}>
                                            {hasDiscount ? `${discount}% OFF` : `+${Math.abs(discount)}%`}
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                                        hasDiscount ? "bg-[#f05526]/20" : "bg-white/10 group-hover:bg-white/15"
                                    )}>
                                        <type.icon size={22} className={hasDiscount ? "text-[#f05526]" : "text-white/70"} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-base font-bold text-white">{type.title}</div>
                                        <div className="text-xs text-white/40">
                                            {label || type.description}
                                        </div>
                                    </div>
                                    <ArrowLeft size={16} className="text-white/30 rotate-180" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Reservaciones */}
                <div className="px-6 pb-6">
                    <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                        ¿Querés reservar?
                    </h3>
                    <div className="space-y-2">
                        {/* Regular reservation */}
                        <button
                            onClick={() => router.push(`/order/${restaurantId}/reserve`)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                        >
                            <div className="w-11 h-11 rounded-xl bg-white/10 group-hover:bg-white/15 flex items-center justify-center transition-colors">
                                <CalendarDays size={22} className="text-white/70" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-base font-bold text-white">Reservar Mesa</div>
                                <div className="text-xs text-white/40">Elegí día y horario</div>
                            </div>
                            <ArrowLeft size={16} className="text-white/30 rotate-180" />
                        </button>

                        {/* Events */}
                        <button
                            onClick={() => router.push(`/order/${restaurantId}/reserve?type=event`)}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:from-purple-500/15 hover:to-pink-500/15 transition-all group"
                        >
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                <Sparkles size={22} className="text-purple-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-base font-bold text-white">Eventos Especiales</div>
                                <div className="text-xs text-white/40">Mirá próximos eventos</div>
                            </div>
                            <ArrowLeft size={16} className="text-white/30 rotate-180" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 text-center text-xs text-white/20 border-t border-white/5">
                Powered by <span className="font-semibold text-white/40">Seencel<span className="text-white/60">Resto</span></span>
            </div>
        </div >
    );
}
