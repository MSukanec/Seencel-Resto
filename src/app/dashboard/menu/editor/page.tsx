"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Plus, UtensilsCrossed, Loader2, ChefHat } from "lucide-react";
import {
    getMenu,
    MenuCategory,
    MenuItem,
    deleteCategory,
    deleteMenuItem,
    updateCategorySort,
    updateItemSort,
    upsertMenuItem,
    bulkUpdateCategorySector
} from "@/lib/supabase/menu-queries";
import {
    getMenus,
    duplicateMenu,
    deleteMenu as deleteMenuFromDB,
    Menu
} from "@/lib/supabase/menu-list-queries";
import { useConfirm } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSectors, type KitchenSector } from "@/lib/supabase/sector-queries";
import * as Accordion from "@radix-ui/react-accordion";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    SortableCategory,
    CategoryFormModal,
    ItemFormModal,
    ItemProfileModal,
    MenuFormModal,
    MenuSelector
} from "@/features/menu";

export default function MenuPage() {
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [sectors, setSectors] = useState<KitchenSector[]>([]);

    // Menu collection state
    const [menus, setMenus] = useState<Menu[]>([]);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<Partial<Menu> | null>(null);

    // Modals state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Partial<MenuCategory> | null>(null);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
    const [bulkSectorCategoryId, setBulkSectorCategoryId] = useState<string | null>(null);

    // Accordion state - persists across refreshes
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);

    const confirm = useConfirm();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const id = document.cookie.match(/(^| )selected_restaurant_id=([^;]+)/)?.[2];
        if (id) {
            setRestaurantId(id);
            fetchMenu(id);
            fetchSectors(id);
            fetchMenuList(id);
        }
    }, []);

    const fetchSectors = async (id: string) => {
        const { data } = await getSectors(id);
        if (data) setSectors(data);
    };

    const fetchMenu = async (id: string) => {
        setLoading(true);
        const { data, error } = await getMenu(id);
        if (!error && data) setCategories(data);
        setLoading(false);
    };

    const fetchMenuList = async (id: string) => {
        const { data } = await getMenus(id);
        if (data) {
            setMenus(data);
            // Set active menu to default or first
            const defaultMenu = data.find(m => m.is_default) || data[0];
            if (defaultMenu && !activeMenuId) {
                setActiveMenuId(defaultMenu.id);
            }
        }
    };

    // Menu handlers
    const handleDeleteMenu = async (menu: Menu) => {
        if (!restaurantId) return;
        const confirmed = await confirm({
            title: "Eliminar Menú",
            message: `¿Estás seguro de eliminar el menú "${menu.name}"?`,
            confirmText: "Eliminar",
            variant: "danger"
        });
        if (confirmed) {
            await deleteMenuFromDB(menu.id);
            // Select another menu after deletion
            const remaining = menus.filter(m => m.id !== menu.id);
            const nextMenu = remaining.find(m => m.is_default) || remaining[0];
            if (nextMenu) {
                setActiveMenuId(nextMenu.id);
            } else {
                setActiveMenuId(null);
            }
            fetchMenuList(restaurantId);
        }
    };

    const handleDuplicateMenu = async (menu: Menu) => {
        if (!restaurantId) return;
        const { data } = await duplicateMenu(menu.id, `${menu.name} (copia)`, restaurantId);
        fetchMenuList(restaurantId);
        if (data) {
            setActiveMenuId(data.id);
        }
    };

    // Drag handlers
    const handleDragEndCategories = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex(c => c.id === active.id);
        const newIndex = categories.findIndex(c => c.id === over.id);

        const newCategories = arrayMove(categories, oldIndex, newIndex);
        setCategories(newCategories);

        const updates = newCategories.map((cat, idx) => ({ id: cat.id, sort_order: idx }));
        await updateCategorySort(updates);
    };

    const handleDragEndItems = async (event: DragEndEvent, categoryId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const category = categories.find(c => c.id === categoryId);
        if (!category || !category.items) return;

        const oldIndex = category.items.findIndex(i => i.id === active.id);
        const newIndex = category.items.findIndex(i => i.id === over.id);

        const newItems = arrayMove(category.items, oldIndex, newIndex);
        setCategories(categories.map(c => c.id === categoryId ? { ...c, items: newItems } : c));

        const updates = newItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
        await updateItemSort(updates);
    };

    // Delete handlers
    const handleDeleteCategory = async (id: string) => {
        const cat = categories.find(c => c.id === id);
        const confirmed = await confirm({
            title: "Eliminar Categoría",
            message: `¿Estás seguro de que querés eliminar "${cat?.name || 'esta categoría'}"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            variant: "danger"
        });


        if (!confirmed) return;
        await deleteCategory(id);
        fetchMenu(restaurantId!);
    };

    const handleDeleteItem = async (id: string) => {
        let itemName = '';
        for (const cat of categories) {
            const item = cat.items?.find(i => i.id === id);
            if (item) { itemName = item.name; break; }
        }

        const confirmed = await confirm({
            title: "Eliminar Item",
            message: `¿Estás seguro de que querés eliminar "${itemName || 'este item'}"?`,
            confirmText: "Eliminar",
            variant: "danger"
        });

        if (!confirmed) return;
        await deleteMenuItem(id);
        fetchMenu(restaurantId!);
    };

    const toggleItemAvailability = async (item: MenuItem) => {
        await upsertMenuItem({ ...item, is_available: !item.is_available });
        fetchMenu(restaurantId!);
    };

    // Bulk assign sector to all items in category
    const handleBulkAssignSector = async (sectorId: string | null) => {
        if (!bulkSectorCategoryId) return;
        await bulkUpdateCategorySector(bulkSectorCategoryId, sectorId);
        setBulkSectorCategoryId(null);
        fetchMenu(restaurantId!);
    };

    // Get items count for a category
    const getItemsCount = () => {
        const cat = categories.find(c => c.id === editingItem?.category_id);
        return cat?.items?.length || 0;
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={UtensilsCrossed}
                title="Carta"
                subtitle={`${categories.length} categorías registradas`}
                actions={
                    <button
                        onClick={() => {
                            setEditingCategory({ name: "" });
                            setIsCategoryModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Nueva Categoría
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="p-10 bg-muted rounded-full">
                                <UtensilsCrossed size={64} className="text-muted-foreground/30" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">Tu Menú está vacío</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Agrega tu primera categoría para empezar a organizar tus platos.
                                </p>
                                <button
                                    onClick={() => {
                                        setEditingCategory({ name: "" });
                                        setIsCategoryModalOpen(true);
                                    }}
                                    className="mt-4 bg-primary/10 text-primary px-6 py-2 rounded-full text-sm font-bold hover:bg-primary hover:text-white transition-all"
                                >
                                    Crear mi primera categoría
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Accordion.Root
                            type="multiple"
                            className="w-full"
                            value={openAccordions}
                            onValueChange={setOpenAccordions}
                        >
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEndCategories}
                            >
                                <SortableContext
                                    items={categories.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {categories.map((category) => (
                                        <SortableCategory
                                            key={category.id}
                                            category={category}
                                            sectors={sectors}
                                            onEditCategory={(cat) => {
                                                setEditingCategory(cat);
                                                setIsCategoryModalOpen(true);
                                            }}
                                            onDeleteCategory={handleDeleteCategory}
                                            onAddItem={(catId) => {
                                                setEditingItem({ name: "", category_id: catId, price: 0, is_available: true });
                                                setIsItemModalOpen(true);
                                            }}
                                            onViewItem={(item) => setViewingItem(item)}
                                            onEditItem={(item) => {
                                                setEditingItem(item);
                                                setIsItemModalOpen(true);
                                            }}
                                            onDeleteItem={handleDeleteItem}
                                            onToggleItemAvailability={toggleItemAvailability}
                                            onItemsDragEnd={handleDragEndItems}
                                            onBulkAssignSector={(catId) => setBulkSectorCategoryId(catId)}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </Accordion.Root>
                    )}
                </div>
            </div>

            {/* Modals */}
            {restaurantId && (
                <>
                    <CategoryFormModal
                        isOpen={isCategoryModalOpen}
                        onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
                        onSuccess={() => fetchMenu(restaurantId)}
                        restaurantId={restaurantId}
                        editingCategory={editingCategory}
                        categoriesCount={categories.length}
                    />
                    <ItemFormModal
                        isOpen={isItemModalOpen}
                        onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}
                        onSuccess={() => fetchMenu(restaurantId)}
                        restaurantId={restaurantId}
                        editingItem={editingItem}
                        sectors={sectors}
                        itemsCount={getItemsCount()}
                    />
                </>
            )}

            {/* Bulk Sector Assignment Modal */}
            {bulkSectorCategoryId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setBulkSectorCategoryId(null)}>
                    <div className="bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-2">Asignar Sector</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Seleccioná un sector para asignarlo a todos los items de esta categoría
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {sectors.map(sector => (
                                <button
                                    key={sector.id}
                                    onClick={() => handleBulkAssignSector(sector.id)}
                                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${sector.color}20`, color: sector.color }}
                                    >
                                        <ChefHat size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{sector.name}</div>
                                        {sector.description && (
                                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{sector.description}</div>
                                        )}
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={() => handleBulkAssignSector(null)}
                                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/50 transition-all text-left col-span-2"
                            >
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted text-muted-foreground">
                                    <ChefHat size={20} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-muted-foreground">Sin Sector</div>
                                    <div className="text-xs text-muted-foreground">Quitar sector de todos</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Profile Modal (View Only) */}
            <ItemProfileModal
                item={viewingItem}
                onClose={() => setViewingItem(null)}
                onEdit={(item) => {
                    setViewingItem(null);
                    setEditingItem(item);
                    setIsItemModalOpen(true);
                }}
            />

            {/* Menu Form Modal */}
            {restaurantId && (
                <MenuFormModal
                    isOpen={isMenuFormOpen}
                    onClose={() => {
                        setIsMenuFormOpen(false);
                        setEditingMenu(null);
                    }}
                    onSuccess={(menu) => {
                        fetchMenuList(restaurantId);
                        setActiveMenuId(menu.id);
                    }}
                    restaurantId={restaurantId}
                    editingMenu={editingMenu}
                    menusCount={menus.length}
                />
            )}
        </div>
    );
}
