"use client";

import { useEffect, useState, useRef, TouchEvent } from "react";
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
    CreditCard,
    Banknote,
    Trash2,
    Tag
} from "lucide-react";
import { useOrderContext } from "../layout";
import { getMenu, MenuCategory, MenuItem } from "@/lib/supabase/menu-queries";
import { cn } from "@/lib/utils";

interface CartItem {
    item: MenuItem;
    quantity: number;
}

export default function MenuPage() {
    const router = useRouter();
    const params = useParams();
    const restaurantId = params.restaurantId as string;
    const { restaurant } = useOrderContext();

    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Item detail modal
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [itemQuantity, setItemQuantity] = useState(1);

    // Discount from session
    const [discount, setDiscount] = useState(0);
    const [orderType, setOrderType] = useState("");

    // Swipe gesture refs
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMenu();
        // Get discount from session
        const savedDiscount = sessionStorage.getItem("order_discount");
        const savedType = sessionStorage.getItem("order_type");
        if (savedDiscount) setDiscount(parseFloat(savedDiscount));
        if (savedType) setOrderType(savedType);
    }, []);

    const fetchMenu = async () => {
        const { data } = await getMenu(restaurantId);
        if (data) {
            setCategories(data);
            if (data.length > 0) {
                setSelectedCategory(data[0].id);
            }
        }
        setLoading(false);
    };

    // Cart functions
    const addToCart = (item: MenuItem, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                return prev.map(c =>
                    c.item.id === item.id
                        ? { ...c, quantity: c.quantity + quantity }
                        : c
                );
            }
            return [...prev, { item, quantity }];
        });
        setSelectedItem(null);
        setItemQuantity(1);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(c => c.item.id !== itemId));
    };

    const updateCartQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === itemId) {
                const newQty = c.quantity + delta;
                return newQty > 0 ? { ...c, quantity: newQty } : c;
            }
            return c;
        }).filter(c => c.quantity > 0));
    };

    const getCartItemQuantity = (itemId: string) => {
        return cart.find(c => c.item.id === itemId)?.quantity || 0;
    };

    const cartSubtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    // Calculate discount
    const discountAmount = discount > 0 ? Math.round(cartSubtotal * discount / 100) : 0;
    const surchargeAmount = discount < 0 ? Math.round(cartSubtotal * Math.abs(discount) / 100) : 0;
    const cartTotal = cartSubtotal - discountAmount + surchargeAmount;

    const getOrderTypeLabel = () => {
        switch (orderType) {
            case "dine-in": return "En el Local";
            case "pickup": return "Para Retirar";
            case "delivery": return "Delivery";
            default: return "";
        }
    };

    // Handle checkout
    const handleCheckout = () => {
        sessionStorage.setItem("order_cart", JSON.stringify({
            items: cart.map(c => ({
                id: c.item.id,
                name: c.item.name,
                quantity: c.quantity,
                price: c.item.price,
                sector_id: c.item.sector_id || null
            })),
            subtotal: cartSubtotal,
            discount: discountAmount,
            surcharge: surchargeAmount,
            total: cartTotal
        }));
        router.push(`/order/${restaurantId}/confirmation`);
    };

    // Filter items
    const filteredCategories = categories.map(cat => ({
        ...cat,
        items: cat.items?.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items && cat.items.length > 0);

    // Swipe handlers
    const handleTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(diff) < threshold || !selectedCategory) return;

        const currentIndex = categories.findIndex(c => c.id === selectedCategory);
        if (currentIndex === -1) return;

        if (diff > 0 && currentIndex < categories.length - 1) {
            // Swipe left -> next category
            setSelectedCategory(categories[currentIndex + 1].id);
        } else if (diff < 0 && currentIndex > 0) {
            // Swipe right -> previous category
            setSelectedCategory(categories[currentIndex - 1].id);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="animate-spin text-white/50" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Buscar en el menú..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
                        />
                    </div>
                </div>

                {/* Category tabs - Hidden scrollbar */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                                selectedCategory === cat.id
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-white/60 border-white/10 hover:border-white/20"
                            )}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </header>

            {/* Menu Content with swipe */}
            <div
                ref={contentRef}
                className="flex-1 overflow-y-auto pb-24"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {searchQuery ? (
                    <div className="p-4 space-y-6">
                        {filteredCategories.map(cat => (
                            <div key={cat.id}>
                                <h3 className="font-medium text-white/40 text-sm uppercase tracking-wider mb-3">{cat.name}</h3>
                                <div className="space-y-3">
                                    {cat.items?.map(item => (
                                        <MenuItemCard
                                            key={item.id}
                                            item={item}
                                            cartQuantity={getCartItemQuantity(item.id)}
                                            onSelect={() => {
                                                setSelectedItem(item);
                                                setItemQuantity(1);
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
                                }}
                                onQuickAdd={() => addToCart(item, 1)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full flex items-center justify-between bg-white text-black px-6 py-4 rounded-2xl font-bold shadow-2xl shadow-white/10 hover:scale-[1.02] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center">
                                <ShoppingCart size={18} />
                            </div>
                            <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                            {discount > 0 && (
                                <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                    {discount}% OFF
                                </span>
                            )}
                        </div>
                        <div className="text-right">
                            {discount > 0 && (
                                <span className="text-sm line-through text-black/40 mr-2">
                                    ${cartSubtotal.toLocaleString()}
                                </span>
                            )}
                            <span className="text-lg">${cartTotal.toLocaleString()}</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
                    <div className="bg-[#141414] w-full max-w-lg rounded-t-3xl md:rounded-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300 border border-white/10">
                        {selectedItem.image_url ? (
                            <div className="h-56 md:h-64 relative">
                                <img
                                    src={selectedItem.image_url}
                                    alt={selectedItem.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white backdrop-blur-sm border border-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="h-48 md:h-56 bg-white/5 flex items-center justify-center relative">
                                <UtensilsCrossed size={64} className="text-white/20" />
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{selectedItem.name}</h3>
                                {selectedItem.description && (
                                    <p className="text-white/50 mt-2">{selectedItem.description}</p>
                                )}
                            </div>

                            <div className="text-3xl font-bold text-white">
                                ${selectedItem.price.toLocaleString()}
                            </div>

                            <div className="flex items-center justify-center gap-6 py-4">
                                <button
                                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                                >
                                    <Minus size={22} />
                                </button>
                                <span className="text-3xl font-bold text-white w-12 text-center">{itemQuantity}</span>
                                <button
                                    onClick={() => setItemQuantity(itemQuantity + 1)}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                                >
                                    <Plus size={22} />
                                </button>
                            </div>

                            <button
                                onClick={() => addToCart(selectedItem, itemQuantity)}
                                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-white/90 transition-colors"
                            >
                                Agregar • ${(selectedItem.price * itemQuantity).toLocaleString()}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsCartOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0a] shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-white/5">
                        {/* Cart Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">Tu Pedido</h2>
                                {orderType && (
                                    <span className="text-sm text-white/40">{getOrderTypeLabel()}</span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-xl text-white/60"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.map(({ item, quantity }) => (
                                <div key={item.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                                            <UtensilsCrossed size={24} className="text-white/20" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{item.name}</div>
                                        <div className="text-sm text-white/40">
                                            ${item.price.toLocaleString()} c/u
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateCartQuantity(item.id, -1)}
                                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-6 text-center font-medium text-white">{quantity}</span>
                                        <button
                                            onClick={() => updateCartQuantity(item.id, 1)}
                                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center justify-center ml-2"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Cart Footer with Discount Display */}
                        <div className="p-4 border-t border-white/5 space-y-3 bg-[#0a0a0a]">
                            {/* Subtotal */}
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/50">Subtotal</span>
                                <span className="text-white/50">${cartSubtotal.toLocaleString()}</span>
                            </div>

                            {/* Discount Line */}
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-emerald-400 flex items-center gap-2">
                                        <Tag size={14} />
                                        Descuento {getOrderTypeLabel()} ({discount}%)
                                    </span>
                                    <span className="text-emerald-400 font-medium">
                                        -${discountAmount.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Surcharge Line */}
                            {discount < 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-amber-400 flex items-center gap-2">
                                        <Tag size={14} />
                                        Recargo {getOrderTypeLabel()} ({Math.abs(discount)}%)
                                    </span>
                                    <span className="text-amber-400 font-medium">
                                        +${surchargeAmount.toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="border-t border-white/10 pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-medium">Total a pagar</span>
                                    <div className="text-right">
                                        {discount !== 0 && (
                                            <span className="text-sm line-through text-white/30 mr-2">
                                                ${cartSubtotal.toLocaleString()}
                                            </span>
                                        )}
                                        <span className="text-2xl font-bold text-white">${cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment options */}
                            <div className="space-y-2 pt-2">
                                <button
                                    onClick={handleCheckout}
                                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold hover:bg-white/90 transition-colors"
                                >
                                    <CreditCard size={20} />
                                    Pagar con Tarjeta
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full flex items-center justify-center gap-3 bg-[#00bcff] text-white py-4 rounded-2xl font-bold hover:bg-[#00bcff]/90 transition-colors"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                                    </svg>
                                    Mercado Pago
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    className="w-full flex items-center justify-center gap-3 bg-white/10 text-white py-4 rounded-2xl font-medium border border-white/10 hover:bg-white/15 transition-colors"
                                >
                                    <Banknote size={20} />
                                    Pagar en Efectivo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Menu item card component - Premium design
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
            className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl mb-3 cursor-pointer hover:border-white/10 transition-all group"
            onClick={onSelect}
        >
            {item.image_url ? (
                <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover"
                />
            ) : (
                <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={28} className="text-white/20" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white group-hover:text-white/90 truncate">{item.name}</div>
                {item.description && (
                    <p className="text-sm text-white/40 truncate mt-0.5">{item.description}</p>
                )}
                <div className="text-white font-bold mt-2">${item.price.toLocaleString()}</div>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd();
                }}
                className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all",
                    cartQuantity > 0
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                )}
            >
                {cartQuantity > 0 ? cartQuantity : <Plus size={20} />}
            </button>
        </div>
    );
}
