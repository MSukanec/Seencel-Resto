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
    Pencil,
    Tag as TagIcon,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { TAG_ICONS } from "@/lib/tag-icons";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // Array of Tag IDs
    const [originalTags, setOriginalTags] = useState<string[]>([]); // For diffing

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
        if (restaurantId) {
            fetchCustomers();
            fetchTags();
        }
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

    const fetchTags = async () => {
        if (!restaurantId) return;
        const { data } = await getRestaurantTags(restaurantId);
        if (data) setAllTags(data);
    };

    const openModal = (customer?: Customer) => {
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
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCustomer?.first_name || !restaurantId) return;

        setSaving(true);

        // 1. Save Customer
        const { data: savedCustomer, error } = await upsertCustomer({
            ...editingCustomer,
            restaurant_id: restaurantId as string
        });

        if (!error && savedCustomer) {
            // 2. Sync Tags
            const customerId = savedCustomer.id;

            // Tags to add
            const toAdd = selectedTags.filter(id => !originalTags.includes(id));
            // Tags to remove
            const toRemove = originalTags.filter(id => !selectedTags.includes(id));

            await Promise.all([
                ...toAdd.map(tagId => assignCustomerTag(customerId, tagId)),
                ...toRemove.map(tagId => removeCustomerTag(customerId, tagId))
            ]);

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
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-6 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
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
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nuevo Cliente</span>
                    </button>
                </div>
            </div>

            {/* List */}
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
                            <div
                                key={customer.id}
                                onClick={() => setViewingCustomer(customer)}
                                className="group bg-card border border-border/60 rounded-xl px-6 py-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-6 relative min-h-[100px] cursor-pointer"
                            >
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                                    {customer.first_name[0]}{customer.last_name?.[0]}
                                </div>

                                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                    {/* Name & ID */}
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                            {customer.first_name} {customer.last_name}
                                        </h3>
                                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold opacity-60">
                                            ID: {customer.id.slice(0, 8)}
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="flex flex-col gap-1">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone size={13} className="text-primary/70 shrink-0" />
                                                {customer.phone}
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                                <Mail size={13} className="text-primary/70 shrink-0" />
                                                <span className="truncate max-w-[150px]">{customer.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Address */}
                                    <div className="flex flex-col justify-center">
                                        {customer.address_raw && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin size={13} className="text-primary/70 shrink-0" />
                                                <span className="line-clamp-2 text-xs">{customer.address_raw}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags Display */}
                                    <div className="flex flex-wrap gap-1.5 justify-start lg:justify-end">
                                        {customer.tags && customer.tags.length > 0 ? (
                                            customer.tags.map(tag => {
                                                const IconComponent = TAG_ICONS[tag.icon || "Tag"] || TAG_ICONS["Tag"];
                                                return (
                                                    <div
                                                        key={tag.id}
                                                        className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-sm border"
                                                        style={{
                                                            backgroundColor: `${tag.color}15`,
                                                            color: tag.color,
                                                            borderColor: `${tag.color}30`
                                                        }}
                                                        title={tag.name}
                                                    >
                                                        <IconComponent size={12} strokeWidth={2.5} />
                                                        <span>{tag.name}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-xs text-muted-foreground/40 italic">
                                                Sin etiquetas
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto">
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
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-150">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openModal(customer);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/5 hover:text-primary transition-colors text-left"
                                            >
                                                <Pencil size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCustomerToDelete(customer.id);
                                                    setActiveMenuId(null);
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
                            Esta acción no se puede deshacer. Se eliminarán permanentemente los datos del cliente.
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

            {/* View Profile Modal */}
            <Dialog
                isOpen={!!viewingCustomer}
                onClose={() => setViewingCustomer(null)}
                title="Perfil del Cliente"
            >
                {viewingCustomer && (
                    <div className="space-y-6">
                        {/* Header Profile */}
                        <div className="flex items-center gap-5">
                            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shadow-sm border border-primary/10">
                                {viewingCustomer.first_name?.[0]}{viewingCustomer.last_name?.[0]}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{viewingCustomer.first_name} {viewingCustomer.last_name}</h2>
                                <p className="text-sm text-muted-foreground font-mono mt-1">ID: {viewingCustomer.id.slice(0, 8)}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {viewingCustomer.tags?.map(tag => {
                                        const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                        return (
                                            <span
                                                key={tag.id}
                                                className="px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide border"
                                                style={{
                                                    backgroundColor: `${tag.color}10`,
                                                    color: tag.color,
                                                    borderColor: `${tag.color}30`
                                                }}
                                            >
                                                <IconComponent size={10} strokeWidth={3} />
                                                {tag.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Contact Box */}
                            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-3">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Contacto</h3>

                                <div className="space-y-3">
                                    {viewingCustomer.phone ? (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-background rounded-lg text-primary shadow-sm">
                                                    <Phone size={16} />
                                                </div>
                                                <span className="font-medium text-sm">{viewingCustomer.phone}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={`tel:${viewingCustomer.phone}`}
                                                    className="p-1.5 hover:bg-primary/10 rounded-md text-primary tooltip"
                                                    title="Llamar"
                                                >
                                                    <Phone size={14} />
                                                </a>
                                                <a
                                                    href={`https://wa.me/${viewingCustomer.phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-green-500/10 rounded-md text-green-600 tooltip"
                                                    title="WhatsApp"
                                                >
                                                    <MessageSquare size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic pl-11">Sin teléfono</div>
                                    )}

                                    {viewingCustomer.email ? (
                                        <div className="flex items-center justify-between group">
                                            <a href={`mailto:${viewingCustomer.email}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                <div className="p-2 bg-background rounded-lg text-primary shadow-sm">
                                                    <Mail size={16} />
                                                </div>
                                                <span className="font-medium text-sm truncate max-w-[180px]">{viewingCustomer.email}</span>
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic pl-11">Sin email</div>
                                    )}
                                </div>
                            </div>

                            {/* Address Box */}
                            <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">Dirección</h3>
                                <div className="flex gap-3">
                                    <div className="p-2 bg-background rounded-lg text-primary shadow-sm h-min">
                                        <MapPin size={16} />
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {viewingCustomer.address_raw || "Sin dirección registrada"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Observations */}
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Observaciones</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed italic">
                                {viewingCustomer.observations || "No hay observaciones."}
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end pt-2 border-t border-border/50">
                            <button
                                onClick={() => {
                                    setViewingCustomer(null);
                                    openModal(viewingCustomer);
                                }}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                            >
                                <Pencil size={16} />
                                Editar Cliente
                            </button>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Create/Edit Modal */}
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
                            rows={2}
                            placeholder="Calle, Ciudad, Provincia..."
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                            value={editingCustomer?.address_raw || ""}
                            onChange={(e) => setEditingCustomer({ ...editingCustomer, address_raw: e.target.value })}
                        />
                    </div>

                    {/* Tags Section */}
                    <div className="space-y-2 pt-2 border-t border-border mt-4">
                        <label className="text-sm font-medium flex items-center gap-2 mt-4 mb-3">
                            <TagIcon size={14} className="text-primary" /> Etiquetas
                        </label>

                        {/* Selected Tags Preview */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {allTags.filter(t => selectedTags.includes(t.id)).map(tag => {
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <span
                                        key={tag.id}
                                        className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-semibold border"
                                        style={{
                                            backgroundColor: `${tag.color}15`,
                                            color: tag.color,
                                            borderColor: `${tag.color}50`
                                        }}
                                    >
                                        <IconComponent size={12} />
                                        {tag.name}
                                        <button
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            className="ml-1 hover:opacity-70"
                                        >
                                            ×
                                        </button>
                                    </span>
                                );
                            })}
                            {selectedTags.length === 0 && (
                                <span className="text-xs text-muted-foreground italic h-7 flex items-center">
                                    Ninguna etiqueta seleccionada
                                </span>
                            )}
                        </div>

                        {/* Tag Selector Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto p-1">
                            {allTags.map(tag => {
                                const isSelected = selectedTags.includes(tag.id);
                                const IconComponent = TAG_ICONS[tag.icon || ""] || TAG_ICONS["Tag"];
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all text-left",
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "border-border bg-card hover:bg-muted"
                                        )}
                                    >
                                        <div
                                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                                            style={{ backgroundColor: tag.color || '#ccc' }}
                                        >
                                            <IconComponent size={12} />
                                        </div>
                                        <span className="truncate">{tag.name}</span>
                                        {isSelected && <Check size={12} className="ml-auto text-primary" />}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all justify-center"
                                onClick={() => alert("Ve a Configuración > Etiquetas para crear nuevas.")}
                            >
                                <Plus size={12} /> Crear nueva
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare size={14} className="text-primary" /> Observaciones
                        </label>
                        <textarea
                            rows={3}
                            className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={editingCustomer?.observations || ""}
                            onChange={(e) => setEditingCustomer({ ...editingCustomer, observations: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
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

