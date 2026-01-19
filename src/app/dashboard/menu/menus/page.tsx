"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Menu as MenuIcon, Plus, Loader2, Check, Star, Pencil, Trash2, Copy, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";
import {
    getMenus,
    deleteMenu,
    duplicateMenu,
    syncMenuItems,
    Menu
} from "@/lib/supabase/menu-list-queries";
import { getMenu, MenuCategory } from "@/lib/supabase/menu-queries";
import { MenuFormModal } from "@/features/menu";
import { createClient } from "@/lib/supabase/client";

export default function MenusPage() {
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);

    // Modal state
    const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Partial<Menu> | null>(null);

    // Selection state
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [originalItemIds, setOriginalItemIds] = useState<string[]>([]); // Track saved state
    const [savingAssignment, setSavingAssignment] = useState(false);

    const confirm = useConfirm();

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify([...selectedItemIds].sort()) !== JSON.stringify([...originalItemIds].sort());

    useEffect(() => {
        const id = document.cookie.match(/(^| )selected_restaurant_id=([^;]+)/)?.[2];
        if (id) {
            setRestaurantId(id);
            fetchData(id);
        }
    }, []);

    const fetchData = async (id: string) => {
        setLoading(true);
        const [menusRes, categoriesRes] = await Promise.all([
            getMenus(id),
            getMenu(id)
        ]);
        if (menusRes.data) {
            setMenus(menusRes.data);
            // Auto-select default menu or first one
            const defaultMenu = menusRes.data.find(m => m.is_default) || menusRes.data[0];
            if (defaultMenu) {
                handleSelectMenu(defaultMenu.id);
            }
        }
        if (categoriesRes.data) setCategories(categoriesRes.data);
        setLoading(false);
    };

    // Load current assignments when selecting a menu
    const handleSelectMenu = async (menuId: string) => {
        setSelectedMenuId(menuId);
        const supabase = createClient();
        const { data } = await supabase
            .from("menu_menu_items")
            .select("menu_item_id")
            .eq("menu_id", menuId);
        if (data) {
            const ids = data.map(d => d.menu_item_id);
            setSelectedItemIds(ids);
            setOriginalItemIds(ids); // Save original state
        }
    };

    const handleDeleteMenu = async (menu: Menu) => {
        if (!restaurantId) return;
        const confirmed = await confirm({
            title: "Eliminar Menú",
            message: `¿Estás seguro de eliminar el menú "${menu.name}"?`,
            confirmText: "Eliminar",
            variant: "danger"
        });
        if (confirmed) {
            await deleteMenu(menu.id);
            if (selectedMenuId === menu.id) {
                setSelectedMenuId(null);
                setSelectedItemIds([]);
            }
            fetchData(restaurantId);
        }
    };

    const handleDuplicateMenu = async (menu: Menu) => {
        if (!restaurantId) return;
        const { data } = await duplicateMenu(menu.id, `${menu.name} (copia)`, restaurantId);
        fetchData(restaurantId);
        if (data) {
            handleSelectMenu(data.id);
        }
    };

    // Toggle item selection
    const toggleItem = (itemId: string) => {
        if (selectedItemIds.includes(itemId)) {
            setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
        } else {
            setSelectedItemIds([...selectedItemIds, itemId]);
        }
    };

    // Select all items
    const selectAllItems = () => {
        const allIds = categories.flatMap(c => c.items?.map(i => i.id) || []);
        setSelectedItemIds(allIds);
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedItemIds([]);
    };

    // Save assignments
    const handleSaveAssignment = async () => {
        if (!selectedMenuId) return;
        setSavingAssignment(true);
        await syncMenuItems(selectedMenuId, selectedItemIds);
        setOriginalItemIds(selectedItemIds); // Update original to current after save
        setSavingAssignment(false);
    };

    // Get all item IDs
    const allItemIds = categories.flatMap(c => c.items?.map(i => i.id) || []);
    const isAllSelected = allItemIds.length > 0 && allItemIds.every(id => selectedItemIds.includes(id));

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={MenuIcon}
                title="Gestión de Menús"
                subtitle={`${menus.length} menú${menus.length !== 1 ? 's' : ''} configurado${menus.length !== 1 ? 's' : ''}`}
                actions={
                    <button
                        onClick={() => {
                            setEditingMenu(null);
                            setIsMenuFormOpen(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Nuevo Menú
                    </button>
                }
            />

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Mobile Menu Selector */}
                <div className="md:hidden p-4 border-b border-border bg-background">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Seleccionar Menú
                    </label>
                    <select
                        value={selectedMenuId || ""}
                        onChange={(e) => e.target.value && handleSelectMenu(e.target.value)}
                        className="w-full bg-input border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="">Elegí un menú...</option>
                        {menus.map((menu) => (
                            <option key={menu.id} value={menu.id}>
                                {menu.name} {menu.is_default ? "⭐" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Left Panel - Menu List (Desktop only) */}
                <div className="hidden md:block w-80 border-r border-border bg-background p-4 overflow-y-auto shrink-0">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        Menús Disponibles
                    </div>
                    <div className="space-y-2">
                        {menus.map((menu) => (
                            <div
                                key={menu.id}
                                onClick={() => handleSelectMenu(menu.id)}
                                className={cn(
                                    "group p-4 rounded-xl cursor-pointer transition-all border-2",
                                    selectedMenuId === menu.id
                                        ? "border-primary bg-primary/5"
                                        : "border-transparent hover:bg-muted"
                                )}
                            >
                                <div className="flex items-start gap-3">
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
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{menu.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDuplicateMenu(menu);
                                            }}
                                            className="p-1.5 hover:bg-background rounded-lg text-muted-foreground"
                                            title="Duplicar"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMenu(menu);
                                                setIsMenuFormOpen(true);
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
                                                    handleDeleteMenu(menu);
                                                }}
                                                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {menus.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <MenuIcon size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No hay menús creados</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Item Assignment */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {selectedMenuId ? (
                        <>
                            {/* Selection Controls */}
                            <div className="flex items-center justify-between mb-6 sticky top-0 bg-muted/30 py-2 z-10">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedItemIds.length} de {allItemIds.length} items seleccionados
                                    </span>
                                    <button
                                        onClick={isAllSelected ? clearSelection : selectAllItems}
                                        className="text-sm text-primary font-medium hover:underline"
                                    >
                                        {isAllSelected ? "Quitar todos" : "Seleccionar todos"}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveAssignment}
                                    disabled={savingAssignment || !hasChanges}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                        hasChanges
                                            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                                            : "bg-emerald-500/20 text-emerald-600 cursor-default"
                                    )}
                                >
                                    {savingAssignment ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    {hasChanges ? "Guardar Asignación" : "Guardado"}
                                </button>
                            </div>

                            {/* Item Grid by Category */}
                            <div className="space-y-6">
                                {categories.map((category) => (
                                    <div key={category.id}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h3 className="font-bold text-base md:text-lg">{category.name}</h3>
                                            <span className="text-xs text-muted-foreground">
                                                ({category.items?.length || 0} items)
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                                            {category.items?.map((item) => {
                                                const isSelected = selectedItemIds.includes(item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => toggleItem(item.id)}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2",
                                                            isSelected
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-primary/30 bg-background"
                                                        )}
                                                    >
                                                        <div
                                                            className={cn(
                                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                                                isSelected
                                                                    ? "bg-primary border-primary text-primary-foreground"
                                                                    : "border-border"
                                                            )}
                                                        >
                                                            {isSelected && <Check size={14} />}
                                                        </div>
                                                        {/* Small thumbnail */}
                                                        {item.image_url ? (
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.name}
                                                                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-dashed border-border">
                                                                <UtensilsCrossed size={14} className="text-muted-foreground/40" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm truncate">{item.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                ${item.price.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="p-10 bg-muted rounded-full mb-4">
                                <UtensilsCrossed size={64} className="text-muted-foreground/30" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Seleccioná un menú</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Elegí un menú de la lista de la izquierda para asignarle items de tu carta
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Form Modal */}
            {restaurantId && (
                <MenuFormModal
                    isOpen={isMenuFormOpen}
                    onClose={() => {
                        setIsMenuFormOpen(false);
                        setEditingMenu(null);
                    }}
                    onSuccess={(menu) => {
                        fetchData(restaurantId);
                        handleSelectMenu(menu.id);
                    }}
                    restaurantId={restaurantId}
                    editingMenu={editingMenu}
                    menusCount={menus.length}
                />
            )}
        </div>
    );
}
