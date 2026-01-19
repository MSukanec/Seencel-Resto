"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChefHat, ClipboardList, LogOut, Store, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function MozoHeader() {
    const router = useRouter();
    const supabase = createClient();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [userName, setUserName] = useState("M");

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("users")
                    .select("full_name")
                    .eq("id", user.id)
                    .single();
                setUserName(profile?.full_name?.charAt(0) || user.email?.charAt(0) || "M");
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
        <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-card/95 backdrop-blur-xl border-b border-border">
            {/* Logo */}
            <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg">
                    <ClipboardList size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">
                        Seencel<span className="text-blue-500">Mozo</span>
                    </span>
                    <span className="text-xs text-muted-foreground">Toma de Pedidos</span>
                </div>
            </div>

            {/* Avatar with Popover */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 ring-2 ring-border hover:ring-blue-500 transition-all flex items-center justify-center text-white font-bold text-sm"
                >
                    {userName.toUpperCase()}
                </button>

                {/* Dropdown Popover */}
                {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                        <div className="p-1">
                            <button
                                onClick={() => { setMenuOpen(false); router.push("/modes"); }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <RefreshCw size={16} />
                                Cambiar Modo
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); router.push("/restaurants"); }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent text-foreground"
                            >
                                <Store size={16} />
                                Cambiar Restaurante
                            </button>
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
        </header>
    );
}
