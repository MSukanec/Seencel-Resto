"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Store, ChefHat, ClipboardList, UtensilsCrossed, Wine, Truck, UserCog, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as LucideIcons from "lucide-react";

interface Role {
    id: string;
    name: string;
    code: string;
    description: string | null;
    position: number;
}

interface KitchenSector {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
}

// Role hierarchy - which roles can access which modes
// Key is the user's actual role code, value is array of mode codes they can access
const ROLE_ACCESS: Record<string, string[]> = {
    "owner": ["owner", "manager", "waiter", "delivery"],
    "manager": ["manager", "waiter", "delivery"],
    "waiter": ["waiter"],
    "delivery": ["delivery"],
};

// Role code to route mapping
const ROLE_ROUTES: Record<string, string> = {
    "owner": "/dashboard",
    "manager": "/dashboard",
    "waiter": "/waiter",
    "delivery": "/dashboard",
};

// Role icons mapping by code
const ROLE_ICONS: Record<string, any> = {
    "owner": Store,
    "manager": UserCog,
    "waiter": ClipboardList,
    "delivery": Truck,
};

// Helper to get Lucide icon by name
const getIconByName = (iconName: string | null) => {
    if (!iconName) return ChefHat;
    const pascalCase = iconName.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
    return (LucideIcons as any)[pascalCase] || ChefHat;
};

export default function ModesPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [kitchenSectors, setKitchenSectors] = useState<KitchenSector[]>([]);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [restaurantName, setRestaurantName] = useState("");
    const [userRoleCode, setUserRoleCode] = useState<string | null>(null);

    useEffect(() => {
        initializePage();
    }, []);

    const initializePage = async () => {
        // Get restaurant ID from cookie
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        const id = match ? match[2] : null;

        if (!id) {
            router.push("/restaurants");
            return;
        }

        setRestaurantId(id);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        // Fetch restaurant info
        const { data: restaurant } = await supabase
            .from("restaurants")
            .select("name")
            .eq("id", id)
            .single();

        if (restaurant) {
            setRestaurantName(restaurant.name);
        }

        // Get user's role in this restaurant
        const { data: membership } = await supabase
            .from("restaurant_members")
            .select(`
                role,
                role_data:roles (code)
            `)
            .eq("restaurant_id", id)
            .eq("user_id", user.id)
            .single();

        if (!membership) {
            // User is not a member of this restaurant
            router.push("/restaurants");
            return;
        }

        const memberRoleCode = (membership.role_data as any)?.code || "waiter";
        setUserRoleCode(memberRoleCode);

        // Get accessible mode codes for this user
        const accessibleCodes = ROLE_ACCESS[memberRoleCode] || [memberRoleCode];

        // Fetch only roles that user can access (excluding chef/bartender - now handled by sectors)
        const { data: rolesData } = await supabase
            .from("roles")
            .select("id, name, code, description, position")
            .in("code", accessibleCodes)
            .order("position", { ascending: true });

        if (rolesData) {
            setAvailableRoles(rolesData);
        }

        // Fetch kitchen sectors if user has elevated access (owner, manager)
        if (["owner", "manager"].includes(memberRoleCode)) {
            const { data: sectors } = await supabase
                .from("kitchen_sectors")
                .select("id, name, description, color, icon")
                .eq("restaurant_id", id)
                .eq("is_active", true)
                .order("position", { ascending: true });

            if (sectors) {
                setKitchenSectors(sectors);
            }
        }

        setLoading(false);
    };

    const handleRoleSelect = (role: Role) => {
        if (!restaurantId) return;

        // Set cookie for selected role
        document.cookie = `selected_role=${role.name}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `selected_role_code=${role.code}; path=/; max-age=31536000; SameSite=Lax`;

        // Route based on role code
        const targetRoute = ROLE_ROUTES[role.code] || "/dashboard";
        router.push(targetRoute);
    };

    const handleSectorSelect = (sector: KitchenSector) => {
        if (!restaurantId) return;

        // Set cookie for selected role (as the sector name)
        document.cookie = `selected_role=${sector.name}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `selected_role_code=station; path=/; max-age=31536000; SameSite=Lax`;

        // Route to KDS with sector ID
        router.push(`/kds/${sector.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-background relative">
            {/* Nav Header */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                        <Store size={20} />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-foreground">
                        Seencel<span className="text-primary">Resto</span>
                    </span>
                </div>
                <button
                    onClick={() => router.push('/restaurants')}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <ArrowRight className="rotate-180" size={16} />
                    Cambiar Restaurante
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-24">
                <div className="w-full max-w-4xl space-y-10">
                    <div className="text-center space-y-3 relative z-10">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                            Selecciona tu <span className="text-primary">Modo</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                            Elige cómo quieres acceder a <span className="font-semibold text-foreground">{restaurantName}</span>
                        </p>
                    </div>

                    {/* Standard Roles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableRoles.map((role) => {
                            const RoleIcon = ROLE_ICONS[role.code] || Store;

                            return (
                                <button
                                    key={role.id}
                                    onClick={() => handleRoleSelect(role)}
                                    className="relative flex flex-col items-start p-6 rounded-xl border transition-all duration-300 text-left h-full bg-card border-border hover:border-primary/50 hover:shadow-[0_0_20px_-5px_var(--primary)] hover:scale-105 cursor-pointer"
                                >
                                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <RoleIcon size={22} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{role.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {role.description || "Acceso disponible"}
                                    </p>

                                    <div className="mt-auto pt-6 w-full flex justify-end">
                                        <div className="rounded-full bg-primary/10 p-2 text-primary">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {availableRoles.length === 0 && kitchenSectors.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No tienes acceso a ningún modo en este restaurante.
                        </div>
                    )}

                    {/* Kitchen Stations Section */}
                    {kitchenSectors.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-border">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <ChefHat size={20} className="text-primary" />
                                Estaciones de Preparación
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {kitchenSectors.map((sector) => {
                                    const SectorIcon = getIconByName(sector.icon);

                                    return (
                                        <button
                                            key={sector.id}
                                            onClick={() => handleSectorSelect(sector)}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                                        >
                                            <div
                                                className="h-12 w-12 rounded-lg flex items-center justify-center"
                                                style={{
                                                    backgroundColor: sector.color ? `${sector.color}20` : 'var(--muted)',
                                                    color: sector.color || undefined
                                                }}
                                            >
                                                <SectorIcon size={22} />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h3 className="font-bold">{sector.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {sector.description || "Ver comandas"}
                                                </p>
                                            </div>
                                            <div
                                                className="rounded-full p-2"
                                                style={{
                                                    backgroundColor: sector.color ? `${sector.color}20` : undefined,
                                                    color: sector.color || undefined
                                                }}
                                            >
                                                <ArrowRight size={18} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Customer Mode */}
                    <div className="mt-8 pt-8 border-t border-border">
                        <p className="text-sm text-muted-foreground text-center mb-4">
                            ¿Querés ver cómo ven los clientes tu menú?
                        </p>
                        <button
                            onClick={() => router.push(`/order/${restaurantId}`)}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
                                <ShoppingBag size={22} />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="text-lg font-bold">Modo Cliente</h3>
                                <p className="text-sm text-muted-foreground">
                                    Vista de pedidos para clientes
                                </p>
                            </div>
                            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
                                <ArrowRight size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

