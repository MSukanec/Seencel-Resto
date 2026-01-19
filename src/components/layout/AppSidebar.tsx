"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ChevronDown,
    ChevronRight,
    LogOut,
    Store,
    RefreshCw,
    LucideIcon,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export interface SidebarItem {
    icon: LucideIcon;
    label: string;
    href: string;
    subItems?: SidebarItem[];
}

export interface SidebarVariant {
    name: string;         // "Resto", "Cocina", "Mozo"
    accentClass: string;  // Tailwind classes for accent color
    icon: LucideIcon;
    items: SidebarItem[];
}

interface AppSidebarProps {
    variant: SidebarVariant;
    className?: string;
    onNavigate?: () => void;
    isMobile?: boolean;
    onClose?: () => void;
}

export function AppSidebar({ variant, className, onNavigate, isMobile = false, onClose }: AppSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<{ name: string; email: string; avatar_url?: string | null }>({
        name: "Cargando...",
        email: ""
    });

    // Auto-open accordion based on current route
    useEffect(() => {
        const itemWithActiveSubItem = variant.items.find(
            item => item.subItems?.some(sub => pathname.startsWith(sub.href))
        );
        if (itemWithActiveSubItem) {
            setOpenGroups({ [itemWithActiveSubItem.label]: true });
        }
    }, [pathname, variant.items]);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
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
    }, [supabase]);

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => {
            const isCurrentlyOpen = prev[label];
            return { [label]: !isCurrentlyOpen };
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    return (
        <aside className={cn("flex flex-col border-r border-border bg-card/50 backdrop-blur-xl z-40", className || "w-64")}>
            {/* Header with Branding */}
            <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", variant.accentClass)}>
                        <variant.icon size={20} />
                    </div>
                    <span>Seencel<span className={cn("text-primary", variant.accentClass.includes("teal") && "text-teal-500", variant.accentClass.includes("blue") && "text-blue-500")}>{variant.name}</span></span>
                </div>
                {isMobile && onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>
            {/* Navigation */}
            <nav className={cn("flex-1 space-y-1 overflow-y-auto", isMobile ? "p-3 space-y-2" : "p-4")}>
                {variant.items.map((item) => {
                    const isActive = item.href !== "#" && pathname === item.href;
                    const isGroupOpen = openGroups[item.label];
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isSubActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);

                    return (
                        <div key={item.label}>
                            {hasSubItems ? (
                                <button
                                    onClick={() => toggleGroup(item.label)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 rounded-xl font-medium transition-all hover:bg-white/5",
                                        isMobile ? "px-4 py-3.5 text-base" : "px-3 py-2.5 text-sm",
                                        isSubActive ? variant.accentClass.includes("teal") ? "text-teal-500 bg-teal-500/5" : variant.accentClass.includes("blue") ? "text-blue-500 bg-blue-500/5" : "text-primary bg-primary/5" : "text-muted-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={isMobile ? 22 : 18} />
                                        {item.label}
                                    </div>
                                    {isGroupOpen ? <ChevronDown size={isMobile ? 18 : 14} /> : <ChevronRight size={isMobile ? 18 : 14} />}
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl font-medium transition-all",
                                        isMobile ? "px-4 py-3.5 text-base" : "px-3 py-2.5 text-sm",
                                        isActive
                                            ? variant.accentClass.includes("teal")
                                                ? "bg-teal-500/10 text-teal-500"
                                                : variant.accentClass.includes("blue")
                                                    ? "bg-blue-500/10 text-blue-500"
                                                    : "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-white/5"
                                    )}
                                >
                                    <item.icon size={isMobile ? 22 : 18} />
                                    {item.label}
                                </Link>
                            )}

                            {/* Sub-items */}
                            {hasSubItems && isGroupOpen && (
                                <div className={cn("ml-4 mt-1 border-l border-border/40 pl-3", isMobile ? "space-y-1" : "space-y-0.5")}>
                                    {item.subItems!.map((subItem) => {
                                        const isSubItemActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.href}
                                                href={subItem.href}
                                                onClick={onNavigate}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg transition-all",
                                                    isMobile ? "px-4 py-3 text-base" : "px-3 py-2 text-sm",
                                                    isSubItemActive
                                                        ? variant.accentClass.includes("teal")
                                                            ? "text-teal-500 font-medium"
                                                            : variant.accentClass.includes("blue")
                                                                ? "text-blue-500 font-medium"
                                                                : "text-primary font-medium"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <subItem.icon size={isMobile ? 20 : 16} />
                                                {subItem.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User Menu Footer */}
            <div className="p-4 border-t border-border bg-background/50 relative" ref={userMenuRef}>
                <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 w-full hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                    title={user.name}
                >
                    <div className={cn(
                        "h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary transition-all cursor-pointer flex items-center justify-center text-white font-bold text-sm flex-shrink-0",
                        variant.accentClass.includes("teal")
                            ? "bg-gradient-to-br from-teal-500 to-emerald-500 hover:ring-teal-500"
                            : variant.accentClass.includes("blue")
                                ? "bg-gradient-to-br from-blue-500 to-indigo-500 hover:ring-blue-500"
                                : "bg-gradient-to-br from-primary to-orange-600"
                    )}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                </button>

                {/* Popover */}
                {userMenuOpen && (
                    <div className={cn(
                        "absolute w-56 bg-popover border border-border rounded-xl shadow-xl animate-in fade-in duration-150 z-50",
                        isMobile
                            ? "bottom-full left-0 mb-2 right-0 w-auto slide-in-from-bottom-2"
                            : "left-full bottom-0 ml-2 slide-in-from-left-2"
                    )}>
                        <div className="p-3 border-b border-border">
                            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="p-1">
                            <Link
                                href="/modes"
                                onClick={() => { setUserMenuOpen(false); onNavigate?.(); }}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg font-medium transition-colors hover:bg-accent text-foreground",
                                    isMobile ? "px-4 py-3.5 text-base" : "px-3 py-2.5 text-sm"
                                )}
                            >
                                <RefreshCw size={isMobile ? 20 : 16} />
                                Cambiar Modo
                            </Link>
                            <Link
                                href="/restaurants"
                                onClick={() => { setUserMenuOpen(false); onNavigate?.(); }}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg font-medium transition-colors hover:bg-accent text-foreground",
                                    isMobile ? "px-4 py-3.5 text-base" : "px-3 py-2.5 text-sm"
                                )}
                            >
                                <Store size={isMobile ? 20 : 16} />
                                Cambiar Restaurante
                            </Link>
                            <button
                                onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg font-medium text-destructive transition-colors hover:bg-destructive/10",
                                    isMobile ? "px-4 py-3.5 text-base" : "px-3 py-2.5 text-sm"
                                )}
                            >
                                <LogOut size={isMobile ? 20 : 16} />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
