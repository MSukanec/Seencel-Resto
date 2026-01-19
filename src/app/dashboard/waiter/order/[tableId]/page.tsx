"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Search,
    Minus,
    Plus,
    ShoppingCart,
    X,
    UtensilsCrossed,
    Loader2,
    Trash2,
    Send,
    Users,
    Clock
} from "lucide-react";
import { getMenu, MenuCategory, MenuItem } from "@/lib/supabase/menu-queries";
import { createOrder } from "@/lib/actions/order-actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CartItem {
    item: MenuItem;
    quantity: number;
    notes?: string;
}

interface TableInfo {
    id: string;
    label: string;
    current_pax: number | null;
    current_session_id: string | null;
    opened_at: string | null;
    customerName?: string;
}

export default function WaiterOrderPage() {
    const router = useRouter();
    const params = useParams();
    const tableId = params.tableId as string;
    const supabase = createClient();

    const [table, setTable] = useState<TableInfo | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Item detail modal
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [itemNotes, setItemNotes] = useState("");

    const getRestaurantId = () => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    useEffect(() => {
        const rid = getRestaurantId();
        setRestaurantId(rid);
        if (rid) {
            fetchTableAndMenu(rid);
        }
    }, [tableId]);

    const fetchTableAndMenu = async (rid: string) => {
        // Fetch table info with session
        const { data: tableData } = await supabase
            .from("tables")
            .select(`
                id,
                label,
                current_pax,
                current_session_id,
                opened_at,
                session:sessions!current_session_id(
                    customer:customers(first_name, last_name)
                )
            `)
            .eq("id", tableId)
            .single();

        if (tableData) {
            const session = tableData.session as any;
            const customer = session?.customer;
            setTable({
                id: tableData.id,
                label: tableData.label,
                current_pax: tableData.current_pax,
                current_session_id: tableData.current_session_id,
                opened_at: tableData.opened_at,
                customerName: customer ? `${customer.first_name} ${customer.last_name}`.trim() : undefined
            });
        }

        // Fetch menu
        const { data: menuData } = await getMenu(rid);
        if (menuData) {
            setCategories(menuData);
            if (menuData.length > 0) {
                setSelectedCategory(menuData[0].id);
            }
        }

        setLoading(false);
    };

    // Cart functions
    const addToCart = (item: MenuItem, quantity: number = 1, notes?: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id && c.notes === notes);
            if (existing && !notes) {
                return prev.map(c =>
                    c.item.id === item.id && !c.notes
                        ? { ...c, quantity: c.quantity + quantity }
                        : c
                );
            }
            return [...prev, { item, quantity, notes }];
        });
        setSelectedItem(null);
        setItemQuantity(1);
        setItemNotes("");
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const updateCartQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((c, i) => {
            if (i === index) {
                const newQty = c.quantity + delta;
                return newQty > 0 ? { ...c, quantity: newQty } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const getCartItemQuantity = (itemId: string) => {
        return cart.filter(c => c.item.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
    };

    const cartTotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    // Submit order
    const handleSubmitOrder = async () => {
        if (!restaurantId || !table?.current_session_id || cart.length === 0) return;

        setSubmitting(true);

        const result = await createOrder({
            restaurant_id: restaurantId,
            session_id: table.current_session_id,
            order_type: "dine-in",
            items: cart.map(c => ({
                menu_item_id: c.item.id,
                quantity: c.quantity,
                unit_price: c.item.price,
                notes: c.notes,
                sector_id: c.item.sector_id
            }))
        });

        setSubmitting(false);

        if (result.success) {
            // Go back to waiter panel
            router.push("/waiter");
        } else {
            alert("Error al crear el pedido: " + result.error);
        }
    };

    // Filter items
    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items?.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items && cat.items.length > 0);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (!table?.current_session_id) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center p-8">
                <UtensilsCrossed size={48} className="text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-bold mb-2">Mesa no disponible</h2>
                <p className="text-muted-foreground mb-4">
                    Esta mesa no tiene una sesión activa. Abrí la mesa primero.
                </p>
                <button
                    onClick={() => router.push("/waiter")}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                >
                    Volver al Panel
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.push("/waiter")}
                        className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Table Info Badge */}
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                        <span className="font-bold text-primary">{table.label}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users size={12} />
                            <span>{table.current_pax || "?"}</span>
                        </div>
                        {table.customerName && (
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {table.customerName}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50"
                        />
                    </div>
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                                selectedCategory === cat.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto pb-24">
                {searchQuery ? (
                    <div className="p-4 space-y-6">
                        {filteredCategories.map(cat => (
                            <div key={cat.id}>
                                <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider mb-3">{cat.name}</h3>
                                <div className="space-y-3">
                                    {cat.items?.map(item => (
                                        <MenuItemCard
                                            key={item.id}
                                            item={item}
                                            cartQuantity={getCartItemQuantity(item.id)}
                                            onSelect={() => {
                                                setSelectedItem(item);
                                                setItemQuantity(1);
                                                setItemNotes("");
                                            }}
                                            onQuickAdd={() => addToCart(item, 1)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4">
                        {categories.find(c => c.id === selectedCategory)?.items?.map(item => (
                            <MenuItemCard
                                key={item.id}
                                item={item}
                                cartQuantity={getCartItemQuantity(item.id)}
                                onSelect={() => {
                                    setSelectedItem(item);
                                    setItemQuantity(1);
                                    setItemNotes("");
                                }}
                                onQuickAdd={() => addToCart(item, 1)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 md:left-64 p-4 bg-gradient-to-t from-background via-background to-transparent">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full flex items-center justify-between bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                                <ShoppingCart size={18} />
                            </div>
                            <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                        </div>
                        <span className="text-lg">${cartTotal.toLocaleString()}</span>
                    </button>
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
                    <div className="bg-card w-full max-w-lg rounded-t-3xl md:rounded-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300 border">
                        {selectedItem.image_url ? (
                            <div className="h-48 md:h-56 relative">
                                <img
                                    src={selectedItem.image_url}
                                    alt={selectedItem.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white backdrop-blur-sm"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="h-40 md:h-48 bg-muted flex items-center justify-center relative">
                                <UtensilsCrossed size={48} className="text-muted-foreground/30" />
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-muted-foreground/10 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold">{selectedItem.name}</h3>
                                {selectedItem.description && (
                                    <p className="text-muted-foreground mt-2">{selectedItem.description}</p>
                                )}
                            </div>

                            <div className="text-3xl font-bold text-primary">
                                ${selectedItem.price.toLocaleString()}
                            </div>

                            {/* Notes input */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Notas (opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Sin cebolla, término medio..."
                                    value={itemNotes}
                                    onChange={(e) => setItemNotes(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
                                />
                            </div>

                            <div className="flex items-center justify-center gap-6 py-2">
                                <button
                                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                                    className="w-12 h-12 rounded-xl bg-muted border flex items-center justify-center hover:bg-muted/80 transition-colors"
                                >
                                    <Minus size={20} />
                                </button>
                                <span className="text-3xl font-bold w-12 text-center">{itemQuantity}</span>
                                <button
                                    onClick={() => setItemQuantity(itemQuantity + 1)}
                                    className="w-12 h-12 rounded-xl bg-muted border flex items-center justify-center hover:bg-muted/80 transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <button
                                onClick={() => addToCart(selectedItem, itemQuantity, itemNotes || undefined)}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-colors"
                            >
                                Agregar • ${(selectedItem.price * itemQuantity).toLocaleString()}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l">
                        {/* Cart Header */}
                        <div className="p-4 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Pedido - {table.label}</h2>
                                <span className="text-sm text-muted-foreground">
                                    {table.customerName || "Cliente anónimo"} • {table.current_pax} pax
                                </span>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-muted rounded-xl"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cart.map((cartItem, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl border">
                                    {cartItem.item.image_url ? (
                                        <img
                                            src={cartItem.item.image_url}
                                            alt={cartItem.item.name}
                                            className="w-14 h-14 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                            <UtensilsCrossed size={20} className="text-muted-foreground/50" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{cartItem.item.name}</div>
                                        {cartItem.notes && (
                                            <p className="text-xs text-amber-600 font-medium mt-0.5">
                                                ⚠️ {cartItem.notes}
                                            </p>
                                        )}
                                        <div className="text-sm text-muted-foreground">
                                            ${cartItem.item.price.toLocaleString()} c/u
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateCartQuantity(index, -1)}
                                            className="w-7 h-7 rounded-lg bg-muted border flex items-center justify-center"
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="w-6 text-center font-medium">{cartItem.quantity}</span>
                                        <button
                                            onClick={() => updateCartQuantity(index, 1)}
                                            className="w-7 h-7 rounded-lg bg-muted border flex items-center justify-center"
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(index)}
                                            className="w-7 h-7 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center ml-1"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cart Footer */}
                        <div className="p-4 border-t space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Total</span>
                                <span className="text-2xl font-bold">${cartTotal.toLocaleString()}</span>
                            </div>

                            <button
                                onClick={handleSubmitOrder}
                                disabled={submitting || cart.length === 0}
                                className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Enviar Pedido a Cocina
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Menu item card component
function MenuItemCard({
    item,
    cartQuantity,
    onSelect,
    onQuickAdd
}: {
    item: MenuItem;
    cartQuantity: number;
    onSelect: () => void;
    onQuickAdd: () => void;
}) {
    return (
        <div
            className="flex items-center gap-4 p-3 bg-muted/30 border rounded-xl mb-2 cursor-pointer hover:border-primary/30 transition-all group"
            onClick={onSelect}
        >
            {item.image_url ? (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover"
                />
            ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={24} className="text-muted-foreground/30" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                {item.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{item.description}</p>
                )}
                <div className="font-bold text-primary mt-1">${item.price.toLocaleString()}</div>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd();
                }}
                className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all shrink-0",
                    cartQuantity > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border hover:bg-muted/80"
                )}
            >
                {cartQuantity > 0 ? cartQuantity : <Plus size={20} />}
            </button>
        </div>
    );
}
