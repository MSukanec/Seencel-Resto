"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Users, Search, Plus, Loader2 } from "lucide-react";
import {
    getCustomers,
    Customer,
    upsertCustomer,
    deleteCustomer,
    Tag,
    getRestaurantTags,
    assignCustomerTag,
    removeCustomerTag
} from "@/lib/supabase/customer-queries";
import { useConfirm } from "@/components/ui/confirm-modal";
import { CustomerCard, CustomerProfileModal, CustomerFormModal } from "@/features/customers";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const confirm = useConfirm();

    // Modal State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [originalTags, setOriginalTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const getRestaurantId = () => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    const restaurantId = getRestaurantId();

    useEffect(() => {
        if (restaurantId) {
            fetchCustomers();
            fetchTags();
        }
    }, [restaurantId]);

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
        if (!error && data) setCustomers(data);
        setLoading(false);
    };

    const fetchTags = async () => {
        if (!restaurantId) return;
        const { data } = await getRestaurantTags(restaurantId);
        if (data) setAllTags(data);
    };

    const openForm = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            const currentTagIds = customer.tags?.map(t => t.id) || [];
            setSelectedTags(currentTagIds);
            setOriginalTags(currentTagIds);
        } else {
            setEditingCustomer({ first_name: "" });
            setSelectedTags([]);
            setOriginalTags([]);
        }
        setIsFormOpen(true);
    };

    const handleSave = async (formData: Partial<Customer>) => {
        if (!formData.first_name || !restaurantId) return;

        setSaving(true);
        const { data: savedCustomer, error } = await upsertCustomer({
            ...formData,
            id: editingCustomer?.id,
            restaurant_id: restaurantId
        });

        if (!error && savedCustomer) {
            const customerId = savedCustomer.id;
            const toAdd = selectedTags.filter(id => !originalTags.includes(id));
            const toRemove = originalTags.filter(id => !selectedTags.includes(id));

            await Promise.all([
                ...toAdd.map(tagId => assignCustomerTag(customerId, tagId)),
                ...toRemove.map(tagId => removeCustomerTag(customerId, tagId))
            ]);

            await fetchCustomers();
            setIsFormOpen(false);
            setEditingCustomer(null);
        } else {
            alert("Error al guardar cliente");
        }
        setSaving(false);
    };

    const handleDelete = async (customerId: string) => {
        const confirmed = await confirm({
            title: "¿Eliminar cliente?",
            message: "Esta acción no se puede deshacer. Se eliminarán permanentemente los datos del cliente.",
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });

        if (confirmed) {
            await deleteCustomer(customerId);
            fetchCustomers();
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
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
            <PageHeader
                icon={Users}
                title="Clientes"
                subtitle={`${customers.length} clientes registrados`}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
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
                            onClick={() => openForm()}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Nuevo Cliente</span>
                        </button>
                    </div>
                }
            />

            <div className="flex-1 p-4 overflow-y-auto w-full">
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
                    <div className="grid grid-cols-1 gap-4 max-w-5xl mx-auto">
                        {filteredCustomers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                isMenuOpen={activeMenuId === customer.id}
                                onToggleMenu={() => setActiveMenuId(activeMenuId === customer.id ? null : customer.id)}
                                onView={() => setViewingCustomer(customer)}
                                onEdit={() => {
                                    openForm(customer);
                                    setActiveMenuId(null);
                                }}
                                onDelete={() => {
                                    handleDelete(customer.id);
                                    setActiveMenuId(null);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CustomerProfileModal
                customer={viewingCustomer}
                onClose={() => setViewingCustomer(null)}
                onEdit={(customer) => {
                    setViewingCustomer(null);
                    openForm(customer);
                }}
            />

            <CustomerFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                customer={editingCustomer}
                allTags={allTags}
                selectedTags={selectedTags}
                onToggleTag={toggleTag}
                onSave={handleSave}
                saving={saving}
            />
        </div>
    );
}
