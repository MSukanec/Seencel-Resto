"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
    Users,
    Calendar,
    Tag,
    RefreshCw,
    FileSpreadsheet,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSafeFloor } from "@/features/floor-plan";

const SIDEBAR_ITEMS = [
    { icon: LayoutDashboard, label: "Panel", href: "/dashboard" },
    { icon: Calendar, label: "Calendario", href: "/dashboard/calendar" },
    { icon: UtensilsCrossed, label: "Pedidos", href: "/dashboard/orders" },
    {
        icon: ChefHat,
        label: "Menú",
        href: "#",
        subItems: [
            { icon: BookOpen, label: "Editor", href: "/dashboard/menu" },
            { icon: FileSpreadsheet, label: "Importar", href: "/dashboard/settings/menu-import" },
        ]
    },
    { icon: Users, label: "Clientes", href: "/dashboard/customers" },
    {
        icon: Settings,
        label: "Configuración",
        href: "#", // Accordion placeholder
        subItems: [
            { icon: Settings, label: "Ajustes", href: "/dashboard/settings" },
            { icon: Users, label: "Equipo", href: "/dashboard/settings/team" },
            { icon: Tag, label: "Etiquetas", href: "/dashboard/settings/tags" }, // New link
            { icon: PencilRuler, label: "Arquitectura", href: "/dashboard/floor/architecture" },
            { icon: Armchair, label: "Plantillas", href: "/dashboard/floor/tables" },
        ]
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();


    const floorContext = useSafeFloor();
    const floors = floorContext?.floors || [];
    const isLoading = floorContext?.isLoading ?? false;
    const hasFloors = floors && floors.length > 0;
    // Note: Variable name collision if I use isLoading. Changed to isLoadingFloor.
    // Wait, Sidebar has `let isLoading = true` loop later?
    // In step 599 I removed the previous try/catch which declared `isLoading`.
    // Let's check the file content after this tool to be safe about variable names. 

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh(); // Clear server component cache
        router.push("/login");
    };

    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    // Auto-open accordion based on current route
    useEffect(() => {
        const itemWithActiveSubItem = SIDEBAR_ITEMS.find(
            item => item.subItems?.some(sub => pathname.startsWith(sub.href))
        );
        if (itemWithActiveSubItem) {
            setOpenGroups({ [itemWithActiveSubItem.label]: true });
        }
    }, [pathname]);
    const [user, setUser] = useState<{ name: string; email: string; avatar_url?: string | null }>({
        name: "Cargando...",
        email: ""
    });
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                // Fetch profile
                const { data: profile } = await supabase
                    .from("users")
                    .select("full_name, avatar_url")
                    .eq("id", authUser.id)
                    .single();

                setUser({
                    name: profile?.full_name || authUser.email?.split('@')[0] || "Usuario",
                    email: authUser.email || "",
                    avatar_url: profile?.avatar_url
                });
            }
        };
        fetchUser();
    }, []);

    const toggleGroup = (label: string) => {
        // Only one accordion open at a time
        setOpenGroups(prev => {
            const isCurrentlyOpen = prev[label];
            // Close all, then toggle the clicked one
            return { [label]: !isCurrentlyOpen };
        });
    };

    // Close popover on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Safe usage check moved to top level hook call
    // Logic is now safe.



    return (
        <aside className={cn("flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl z-40", className)}>
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
                    // Check if any sub-item is currently active
                    const isSubActive = hasSubItems && item.subItems.some(sub => pathname === sub.href);

                    return (
                        <div key={item.label}>
                            {hasSubItems ? (
                                <button
                                    onClick={() => toggleGroup(item.label)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5",
                                        isSubActive ? "text-primary bg-primary/5" : "text-muted-foreground"
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

            {/* User Avatar Footer */}
            <div className="p-4 border-t border-border bg-background/50 relative" ref={userMenuRef}>
                <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 w-full px-2 py-2 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"
                >
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-emerald-500 ring-2 ring-border shrink-0 flex items-center justify-center text-white font-bold text-sm">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                </button>

                {/* Popover - positioned to the right, bottom aligned */}
                {userMenuOpen && (
                    <div className="absolute left-full bottom-0 ml-2 w-56 bg-popover border border-border rounded-xl shadow-xl animate-in fade-in slide-in-from-left-2 duration-150 z-[9999]">
                        <div className="p-1">
                            <Link
                                href="/restaurants"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <RefreshCw size={16} />
                                Cambiar Modo
                            </Link>
                            <Link
                                href="/restaurants"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <Store size={16} />
                                Cambiar Restaurante
                            </Link>
                            <button
                                onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                            >
                                <LogOut size={16} />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
