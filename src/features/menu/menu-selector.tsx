"use client";

import { useState } from "react";
import { Menu as MenuIcon, ChevronDown, Plus, Star, Pencil, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu } from "@/lib/supabase/menu-list-queries";

interface MenuSelectorProps {
    menus: Menu[];
    activeMenuId: string | null;
    onSelectMenu: (menuId: string) => void;
    onCreateMenu: () => void;
    onEditMenu: (menu: Menu) => void;
    onDeleteMenu: (menu: Menu) => void;
    onDuplicateMenu: (menu: Menu) => void;
}

export function MenuSelector({
    menus,
    activeMenuId,
    onSelectMenu,
    onCreateMenu,
    onEditMenu,
    onDeleteMenu,
    onDuplicateMenu
}: MenuSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const activeMenu = menus.find(m => m.id === activeMenuId) || menus[0];

    if (menus.length === 0) {
        return (
            <button
                onClick={onCreateMenu}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg shadow-primary/20"
            >
                <Plus size={18} />
                Crear Primer Menú
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl hover:border-primary/30 transition-all min-w-[200px]"
            >
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${activeMenu?.color || '#10b981'}20`, color: activeMenu?.color || '#10b981' }}
                >
                    <MenuIcon size={18} />
                </div>
                <div className="flex-1 text-left">
                    <div className="font-bold text-sm flex items-center gap-2">
                        {activeMenu?.name || "Seleccionar Menú"}
                        {activeMenu?.is_default && <Star size={12} className="text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {menus.length} menú{menus.length !== 1 ? 's' : ''} disponible{menus.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <ChevronDown size={18} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="p-2 border-b border-border">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                                Menús Disponibles
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                            {menus.map((menu) => (
                                <div
                                    key={menu.id}
                                    className={cn(
                                        "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                        activeMenuId === menu.id
                                            ? "bg-primary/10 border border-primary/30"
                                            : "hover:bg-muted"
                                    )}
                                    onClick={() => {
                                        onSelectMenu(menu.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${menu.color}20`, color: menu.color }}
                                    >
                                        <MenuIcon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            {menu.name}
                                            {menu.is_default && <Star size={12} className="text-amber-500 fill-amber-500" />}
                                        </div>
                                        {menu.description && (
                                            <p className="text-xs text-muted-foreground truncate">{menu.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDuplicateMenu(menu);
                                                setIsOpen(false);
                                            }}
                                            className="p-1.5 hover:bg-background rounded-lg text-muted-foreground"
                                            title="Duplicar"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditMenu(menu);
                                                setIsOpen(false);
                                            }}
                                            className="p-1.5 hover:bg-background rounded-lg text-muted-foreground"
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        {!menu.is_default && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteMenu(menu);
                                                    setIsOpen(false);
                                                }}
                                                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-border">
                            <button
                                onClick={() => {
                                    onCreateMenu();
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
                            >
                                <Plus size={16} />
                                Crear Nuevo Menú
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
