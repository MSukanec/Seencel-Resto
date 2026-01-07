"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import {
    Users,
    Search,
    Plus,
    MoreVertical,
    Phone,
    Mail,
    MapPin,
    MessageSquare,
    Loader2,
    Trash2,
    Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCustomers, Customer, upsertCustomer, deleteCustomer } from "@/lib/supabase/customer-queries";
import { Dialog } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

    // Helper to get restaurant ID from cookies
    const getRestaurantId = () => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    const restaurantId = getRestaurantId();

    useEffect(() => {
        if (restaurantId) fetchCustomers();
    }, [restaurantId]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if (activeMenuId) {
            window.addEventListener("click", handleClickOutside);
        }
        return () => window.removeEventListener("click", handleClickOutside);
    }, [activeMenuId]);

    const fetchCustomers = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const { data, error } = await getCustomers(restaurantId);
        if (!error && data) {
            setCustomers(data);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer?.first_name || !restaurantId) return;

        setSaving(true);
        const { error } = await upsertCustomer({
            ...editingCustomer,
            restaurant_id: restaurantId as string
        });

        if (!error) {
            await fetchCustomers();
            setIsModalOpen(false);
            setEditingCustomer(null);
        } else {
            alert("Error al guardar cliente");
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        await deleteCustomer(customerToDelete);
        fetchCustomers();
        setCustomerToDelete(null);
    };

    const filteredCustomers = customers
        .filter(c =>
            (c.first_name + " " + (c.last_name || "")).toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.first_name.localeCompare(b.first_name));

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-8 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Clientes</h1>
                        <p className="text-xs text-muted-foreground">{customers.length} clientes registrados</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono..."
                            className="pl-10 pr-4 py-2 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 transition-all focus:w-80"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingCustomer({ first_name: "" });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto w-full">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="p-6 bg-muted rounded-full">
                            <Users size={48} className="text-muted-foreground/50" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium">No se encontraron clientes</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                {searchQuery ? "Prueba con otra búsqueda." : "Comienza agregando tu primer cliente."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredCustomers.map((customer) => (
                            <div
                                key={customer.id}
                                className="group bg-card border border-border rounded-xl px-4 py-3 hover:shadow-md hover:border-primary/30 transition-all duration-300 flex items-center gap-6"
                            >
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                                    {customer.first_name[0]}{customer.last_name?.[0]}
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col justify-center">
                                        <h3 className="font-bold text-base leading-tight">
                                            {customer.first_name} {customer.last_name}
                                        </h3>
                                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold opacity-60">
                                            ID: {customer.id.slice(0, 8)}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone size={13} className="text-primary/70 shrink-0" />
                                                {customer.phone}
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                                <Mail size={13} className="text-primary/70 shrink-0" />
                                                <span className="truncate">{customer.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        {customer.address_raw && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin size={13} className="text-primary/70 shrink-0" />
                                                <span className="line-clamp-1 italic text-xs">{customer.address_raw}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                                        }}
                                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeMenuId === customer.id && (
                                        <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-150">
                                            <button
                                                onClick={() => {
                                                    setEditingCustomer(customer);
                                                    setIsModalOpen(true);
                                                    setActiveMenuId(null); // Close menu after action
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary transition-colors text-left"
                                            >
                                                <Pencil size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCustomerToDelete(customer.id);
                                                    setActiveMenuId(null); // Close menu after action
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/5 hover:text-destructive transition-colors text-left font-medium"
                                            >
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Deletion Confirmation */}
            <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente los datos del cliente de nuestros servidores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Form Modal */}
            <Dialog
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre</label>
                            <input
                                required
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={editingCustomer?.first_name || ""}
                                onChange={(e) => setEditingCustomer({ ...editingCustomer, first_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Apellido</label>
                            <input
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={editingCustomer?.last_name || ""}
                                onChange={(e) => setEditingCustomer({ ...editingCustomer, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone size={14} className="text-primary" /> Teléfono
                            </label>
                            <input
                                type="tel"
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={editingCustomer?.phone || ""}
                                onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail size={14} className="text-primary" /> Correo
                            </label>
                            <input
                                type="email"
                                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                value={editingCustomer?.email || ""}
                                onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MapPin size={14} className="text-primary" /> Dirección
                        </label>
                        <textarea
                            placeholder="Calle, Ciudad, Provincia..."
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[60px]"
                            value={editingCustomer?.address_raw || ""}
                            onChange={(e) => setEditingCustomer({ ...editingCustomer, address_raw: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare size={14} className="text-primary" /> Observaciones
                        </label>
                        <textarea
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
                            value={editingCustomer?.observations || ""}
                            onChange={(e) => setEditingCustomer({ ...editingCustomer, observations: e.target.value })}
                        />
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 className="animate-spin" size={16} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}
