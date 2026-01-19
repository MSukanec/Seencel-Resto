"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
    ChefHat,
    ClipboardList,
    History,
    LogOut,
    Store,
    RefreshCw
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const COCINA_ITEMS = [
    { icon: ClipboardList, label: "Comandas", href: "/cocina" },
    { icon: History, label: "Historial", href: "/cocina/historial" },
];

export function CocinaSidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState({ name: "C", email: "" });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("id", authUser.id)
                    .single();
                setUser({
                    name: profile?.full_name || authUser.email?.split("@")[0] || "Cocinero",
                    email: authUser.email || ""
                });
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <aside className={cn("flex w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl", className)}>
            {/* Header */}
            <div className="flex h-16 items-center border-b border-border px-6">
                <div className="flex items-center gap-2 font-bold text-xl">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
                        <ChefHat size={20} />
                    </div>
                    <span>Seencel<span className="text-teal-500">Cocina</span></span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {COCINA_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-teal-500/10 hover:text-teal-500",
                                isActive ? "bg-teal-500/10 text-teal-500" : "text-muted-foreground"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Avatar Footer with Popover */}
            <div className="p-4 border-t border-border bg-background/50 relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center justify-center w-full"
                    title={user.name}
                >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 ring-2 ring-border hover:ring-teal-500 transition-all cursor-pointer flex items-center justify-center text-white font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                </button>

                {/* Popover - positioned to the right, bottom aligned */}
                {menuOpen && (
                    <div className="absolute left-full bottom-0 ml-2 w-56 bg-popover border border-border rounded-xl shadow-xl animate-in fade-in slide-in-from-left-2 duration-150 z-50">
                        <div className="p-3 border-b border-border">
                            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="p-1">
                            <Link
                                href="/modes"
                                onClick={() => setMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <RefreshCw size={16} />
                                Cambiar Modo
                            </Link>
                            <Link
                                href="/restaurants"
                                onClick={() => setMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <Store size={16} />
                                Cambiar Restaurante
                            </Link>
                            <button
                                onClick={() => { setMenuOpen(false); handleSignOut(); }}
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
