"use client";

import { useState, useEffect } from "react";
import { FloorViewCanvas } from "@/features/floor-plan";
import { Activity, DollarSign, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";

export default function OverviewPage() {
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        if (match) setRestaurantId(match[2]);
    }, []);

    const stats = [
        { label: "Ingresos Totales", value: "$45,231.89", icon: DollarSign, trend: "+20.1% vs mes pasado" },
        { label: "Pedidos Activos", value: "+12", icon: ShoppingBag, trend: "+4 última hora" },
        { label: "Personal Activo", value: "8", icon: Users, trend: "Turno completo" },
        { label: "Ocupación de Mesas", value: "85%", icon: Activity, trend: "+12% vs ayer" },
    ];

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Activity}
                title="Panel"
                subtitle="Resumen en tiempo real"
                actions={
                    <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                        {stats.map((stat, i) => (
                            <div key={i} className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <div className="text-sm font-bold text-foreground">{stat.value}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                                </div>
                                <div className={cn(
                                    "flex flex-col text-[10px]",
                                    stat.trend.includes('+') ? "text-emerald-500" : "text-muted-foreground"
                                )}>
                                    <span className="font-bold">{stat.trend.split(' ')[0]}</span>
                                    <stat.icon size={14} className="opacity-50 ml-auto" />
                                </div>
                            </div>
                        ))}
                    </div>
                }
            />

            <div className="flex-1 overflow-hidden relative">
                {restaurantId && <FloorViewCanvas restaurantId={restaurantId} />}
            </div>
        </div>
    );
}
