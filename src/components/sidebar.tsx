"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Map,
    UtensilsCrossed,
    Settings,
    LogOut,
    ChefHat,
    ChevronDown,
    ChevronRight,
    PencilRuler,
    Armchair,
    Store,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFloor } from "@/contexts/FloorContext";

const SIDEBAR_ITEMS = [
    { icon: LayoutDashboard, label: "Panel", href: "/dashboard" },
    { icon: UtensilsCrossed, label: "Pedidos", href: "/dashboard/orders" },
    { icon: ChefHat, label: "Menú", href: "/dashboard/menu" },
    { icon: Users, label: "Clientes", href: "/dashboard/customers" },
    {
        icon: Settings,
        label: "Configuración",
        href: "#", // Accordion placeholder
        subItems: [
            { icon: Settings, label: "Ajustes", href: "/dashboard/settings" },
            { icon: PencilRuler, label: "Arquitectura", href: "/dashboard/floor/architecture" },
            { icon: Armchair, label: "Plantillas", href: "/dashboard/floor/tables" },
        ]
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        "Configuración": true // Default open
    });

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    // Safe usage of useFloor - we are inside the provider now
    // But we need to handle hydration or if context is missing for some reason
    // Use a custom hook logic or try-catch inside the component is awkward.
    // The clean way: We know it's wrapped.
    let floors: any[] = [];
    let isLoading = true;

    try {
        const floorContext = useFloor();
        floors = floorContext.floors;
        isLoading = floorContext.isLoading;
    } catch (e) {
        // Context might not be available yet or we are outside (e.g. login page if reusing sidebar?)
        // Assuming we are indashboard so it should be fine. Ignore error for safety.
        isLoading = false;
    }

    const hasFloors = floors && floors.length > 0;

    return (
        <aside className={cn("flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl", className)}>
            <div className="flex h-16 items-center border-b border-border px-6">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ChefHat size={20} />
                    </div>
                    <span>Seencel<span className="text-primary">Resto</span></span>
                </div>
            </div>

            <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                {SIDEBAR_ITEMS.map((item) => {
                    const isActive = item.href !== "#" && pathname === item.href;
                    const isGroupOpen = openGroups[item.label];
                    const hasSubItems = item.subItems && item.subItems.length > 0;

                    return (
                        <div key={item.label}>
                            {hasSubItems ? (
                                <button
                                    onClick={() => toggleGroup(item.label)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5",
                                        isGroupOpen ? "text-primary bg-primary/5" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} />
                                        {item.label}
                                    </div>
                                    {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-primary/10 hover:text-primary",
                                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </Link>
                            )}

                            {/* Sub Items */}
                            {hasSubItems && isGroupOpen && (
                                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                                    {item.subItems.map((sub) => {
                                        // LOGIC TO BLOCK TEMPLATES
                                        const isTemplates = sub.label === "Plantillas";
                                        const isDisabled = isTemplates && !hasFloors && !isLoading;

                                        if (isDisabled) {
                                            return (
                                                <div
                                                    key={sub.href}
                                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
                                                    title="Crea un piso primero en Arquitectura"
                                                >
                                                    <sub.icon size={16} />
                                                    {sub.label}
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                                    pathname === sub.href ? "text-primary bg-primary/5" : "text-muted-foreground"
                                                )}
                                            >
                                                <sub.icon size={16} />
                                                {sub.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border space-y-1">
                <Link
                    href="/restaurants"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-primary/10 hover:text-primary text-muted-foreground"
                >
                    <Store size={18} />
                    Cambiar Restaurante
                </Link>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
}
