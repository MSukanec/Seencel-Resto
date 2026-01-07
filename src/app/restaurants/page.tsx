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
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [restaurantToDelete, setRestaurantToDelete] = useState<Organization | null>(null);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login");
                return;
            }

            const { data, error } = await supabase
                .from("restaurants")
                .select("*")
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching organizations:", error);
            } else {
                setOrganizations(data || []);
            }
        } catch (error) {
            console.error("Unexpected error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (id: string) => {
        // Prevent selection if we clicked delete button (propagation)
        console.log(`Selecting restaurant ${id}`);
        document.cookie = `selected_restaurant_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
        router.push("/dashboard");
    };

    const handleCreated = (newRestaurant: Organization) => {
        setOrganizations([newRestaurant, ...organizations]);
    };

    const confirmDelete = (e: React.MouseEvent, org: Organization) => {
        e.stopPropagation(); // Stop card click
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
        <div className="min-h-screen flex flex-col items-center pt-24 px-4 bg-background">
            <div className="w-full max-w-5xl space-y-10">
                {/* Header */}
                <div className="text-center space-y-3 relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                        Hola, <span className="text-primary">Usuario</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                        Selecciona tu espacio de trabajo para continuar o comienza un nuevo proyecto.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">

                    {/* Existing Restaurants */}
                    {organizations.map((org, index) => (
                        <div
                            key={org.id}
                            onClick={() => handleSelect(org.id)}
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

                    {/* Create New Card */}
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
    );
}
