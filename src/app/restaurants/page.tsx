"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store, ArrowRight, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreateRestaurantModal } from "@/components/create-restaurant-modal";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Organization {
    id: string;
    name: string;
    owner_id?: string;
    logo_url?: string;
    slug: string;
    created_at: string;
    status?: string;
}

export default function RestaurantsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [organizations, setOrganizations] = useState<(Organization & { user_role_id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // View State: 'list' or 'roles'
    const [view, setView] = useState<'list' | 'roles'>('list');
    const [selectedRestaurant, setSelectedRestaurant] = useState<(Organization & { user_role_id: string }) | null>(null);
    const [roles, setRoles] = useState<any[]>([]);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [restaurantToDelete, setRestaurantToDelete] = useState<Organization | null>(null);

    const [userName, setUserName] = useState("Usuario");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            // Fetch user profile
            const { data: profile } = await supabase
                .from("users")
                .select("full_name")
                .eq("id", user.id)
                .single();

            if (profile?.full_name) {
                setUserName(profile.full_name);
            } else if (user.email) {
                setUserName(user.email.split('@')[0]);
            }

            // Fetch all available roles
            const { data: rolesData, error: rolesError } = await supabase
                .from("roles")
                .select("*")
                .order("name", { ascending: true });

            if (rolesData) setRoles(rolesData);

            // Fetch restaurants where the user is a member, INCLUDING the role
            const { data, error } = await supabase
                .from("restaurant_members")
                .select(`
                    role,
                    restaurant:restaurants (*)
                `)
                .eq("user_id", user.id);

            if (error) {
                console.error("Error fetching organizations:", error);
            } else {
                // Map the result
                const mappedOrgs = data?.map((item: any) => ({
                    ...item.restaurant,
                    user_role_id: item.role // Store the role ID for this restaurant
                })).filter((item) => item.id) || [];

                mappedOrgs.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setOrganizations(mappedOrgs);
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestaurantClick = (org: Organization & { user_role_id: string }) => {
        console.log(`Selected restaurant ${org.name}, User Role ID: ${org.user_role_id}`);
        setSelectedRestaurant(org);
        setView('roles');
    };

    const handleRoleSelect = (roleId: string) => {
        if (!selectedRestaurant) return;

        // Check if the user has this role
        if (selectedRestaurant.user_role_id !== roleId) {
            // Logic for owner having all roles could go here, but for now strict check
            return;
        }

        console.log(`Entering as role ${roleId}`);
        // Set cookie and redirect
        // We could also store the selected_role_id in a cookie if needed by the backend/middleware
        document.cookie = `selected_restaurant_id=${selectedRestaurant.id}; path=/; max-age=31536000; SameSite=Lax`;
        router.push("/dashboard");
    };

    const handleBackToRestaurants = () => {
        setSelectedRestaurant(null);
        setView('list');
    };

    const handleCreated = (newRestaurant: Organization) => {
        // Optimistic update - requires knowing the default role assigned by the RPC on creation
        // For now, re-fetch is safer to get the role linkage
        fetchData();
        // setOrganizations([newRestaurant, ...organizations]); 
    };

    const confirmDelete = (e: React.MouseEvent, org: Organization) => {
        e.stopPropagation();
        setRestaurantToDelete(org);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!restaurantToDelete) return;

        const { error } = await supabase
            .from("restaurants")
            .delete()
            .eq("id", restaurantToDelete.id);

        if (error) {
            alert("Error al eliminar: " + error.message);
        } else {
            setOrganizations(organizations.filter(o => o.id !== restaurantToDelete.id));
            setDeleteModalOpen(false);
            setRestaurantToDelete(null);
        }
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
                    onClick={() => router.push('/')}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <ArrowRight className="rotate-180" size={16} />
                    Volver al Inicio
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 py-24">
                <div className="w-full max-w-5xl space-y-10">

                    {/* View: Restaurant List */}
                    {view === 'list' && (
                        <>
                            <div className="text-center space-y-3 relative z-10">
                                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                                    Hola, <span className="text-primary">{userName}</span>
                                </h1>
                                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                                    Selecciona tu espacio de trabajo para continuar o comienza un nuevo proyecto.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                {organizations.map((org) => (
                                    <div
                                        key={org.id}
                                        onClick={() => handleRestaurantClick(org)}
                                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer shadow-sm"
                                    >
                                        <div className="relative space-y-5">
                                            <div className="flex justify-between items-start">
                                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                    <Store size={22} />
                                                </div>
                                                <button
                                                    onClick={(e) => confirmDelete(e, org)}
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Eliminar restaurante"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-bold text-foreground">{org.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 truncate max-w-[200px]">{org.slug}</p>
                                            </div>

                                            <div className="pt-2 flex items-center text-sm font-medium text-primary">
                                                Ingresar <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6 text-center hover:bg-accent/50 hover:border-primary/50 transition-all min-h-[220px]"
                                >
                                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                        <Plus size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">Crear Nuevo</h3>
                                    <p className="mt-2 text-sm text-muted-foreground max-w-[200px]">
                                        Añade una nueva sucursal o negocio.
                                    </p>
                                </button>
                            </div>
                        </>
                    )}

                    {/* View: Role Selection */}
                    {view === 'roles' && selectedRestaurant && (
                        <div className="animate-in fade-in slide-in-from-right-10 duration-500">
                            <div className="text-center space-y-3 relative z-10 mb-10">
                                <button
                                    onClick={handleBackToRestaurants}
                                    className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <ArrowRight className="rotate-180 mr-1" size={14} /> Volver a restaurantes
                                </button>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                                    ¿Cómo quieres ingresar?
                                </h1>
                                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                                    Elige tu rol para acceder a <span className="font-semibold text-foreground">{selectedRestaurant.name}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                {roles.map((role) => {
                                    const isUnlocked = selectedRestaurant.user_role_id === role.id;

                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleSelect(role.id)}
                                            disabled={!isUnlocked}
                                            className={`
                                                relative flex flex-col items-start p-6 rounded-xl border transition-all duration-300 text-left h-full
                                                ${isUnlocked
                                                    ? "bg-card border-primary/50 shadow-[0_0_20px_-5px_var(--primary)] hover:scale-105 cursor-pointer"
                                                    : "bg-muted/10 border-white/5 opacity-50 cursor-not-allowed grayscale"
                                                }
                                            `}
                                        >
                                            <div className={`
                                                mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg 
                                                ${isUnlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                                            `}>
                                                {/* You could map icons based on role code here */}
                                                <Store size={22} />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">{role.name}</h3>
                                            <p className="text-sm text-muted-foreground">{role.description || "Sin descripción"}</p>

                                            {isUnlocked && (
                                                <div className="mt-auto pt-6 w-full flex justify-end">
                                                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                                                        <ArrowRight size={20} />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <CreateRestaurantModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleCreated}
                />

                {/* Delete Confirmation Modal */}
                <Dialog
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    title="Eliminar Restaurante"
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                            <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={20} />
                            <div className="text-sm">
                                <p className="font-medium text-destructive">¿Estás seguro de eliminar {restaurantToDelete?.name}?</p>
                                <p className="text-muted-foreground mt-1">
                                    Esta acción eliminará permanentemente todos los datos, pisos, mesas e historial de este restaurante.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                Eliminar Restaurante
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </div>
        </div>
    );
}
