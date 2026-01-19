"use client";

import { useState, useEffect, useMemo } from "react";
import { Map, Users, Loader2, Search, Phone, Mail, MapPin, Store } from "lucide-react";
import { getCustomers, Customer } from "@/lib/supabase/customer-queries";
import { GoogleMapDisplay } from "@/components/maps";
import { PageHeader } from "@/components/layout/PageHeader";
import { TAG_ICONS } from "@/lib/tag-icons";
import { createClient } from "@/lib/supabase/client";

interface Restaurant {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    logo_url: string | null;
}

export default function CustomersMapPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const supabase = createClient();

    const getRestaurantId = () => {
        if (typeof document === "undefined") return null;
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    const restaurantId = getRestaurantId();

    useEffect(() => {
        if (restaurantId) {
            fetchData();
        }
    }, [restaurantId]);

    const fetchData = async () => {
        if (!restaurantId) return;
        setLoading(true);

        // Fetch customers and restaurant in parallel
        const [customersResult, restaurantResult] = await Promise.all([
            getCustomers(restaurantId),
            supabase
                .from("restaurants")
                .select("id, name, latitude, longitude, logo_url")
                .eq("id", restaurantId)
                .single()
        ]);

        if (!customersResult.error && customersResult.data) {
            setCustomers(customersResult.data);
        }

        if (!restaurantResult.error && restaurantResult.data) {
            setRestaurant(restaurantResult.data);
        }

        setLoading(false);
    };

    // Filter customers that have coordinates
    const customersWithLocation = useMemo(() => {
        return customers.filter(c =>
            c.latitude && c.longitude &&
            (searchQuery === "" ||
                (c.first_name + " " + (c.last_name || "")).toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery))
        );
    }, [customers, searchQuery]);

    // Convert to map markers - customers get orange color
    const markers = useMemo(() => {
        const customerMarkers = customersWithLocation.map(c => ({
            id: c.id,
            lat: c.latitude!,
            lng: c.longitude!,
            title: `${c.first_name} ${c.last_name || ""}`.trim(),
            subtitle: c.phone || c.email || c.address_raw || undefined,
            color: "#f97316", // primary orange
            isRestaurant: false,
            logoUrl: undefined as string | null | undefined,
        }));

        // Add restaurant marker if it has location
        if (restaurant?.latitude && restaurant?.longitude) {
            customerMarkers.unshift({
                id: "restaurant",
                lat: restaurant.latitude,
                lng: restaurant.longitude,
                title: restaurant.name,
                subtitle: "Tu restaurante",
                color: "#16a34a", // green for restaurant
                isRestaurant: true,
                logoUrl: restaurant.logo_url,
            });
        }

        return customerMarkers;
    }, [customersWithLocation, restaurant]);

    const handleMarkerClick = (marker: { id: string }) => {
        if (marker.id === "restaurant") {
            setSelectedCustomer(null);
            return;
        }
        const customer = customers.find(c => c.id === marker.id);
        setSelectedCustomer(customer || null);
    };

    const customersWithoutLocation = customers.length - customersWithLocation.length;

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Map}
                title="Mapa de Clientes"
                subtitle={`${customersWithLocation.length} clientes con ubicación`}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                className="pl-10 pr-4 py-2 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                }
            />

            <div className="flex-1 p-4 flex gap-4 overflow-hidden">
                {loading ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <>
                        {/* Map */}
                        <div className="flex-1 h-full">
                            <GoogleMapDisplay
                                markers={markers}
                                zoom={12}
                                height="100%"
                                onMarkerClick={handleMarkerClick}
                                showInfoWindow={false}
                            />
                        </div>

                        {/* Sidebar with selected customer or stats */}
                        <div className="w-80 shrink-0 bg-card border border-border rounded-xl p-4 overflow-y-auto hidden lg:block">
                            {selectedCustomer ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {selectedCustomer.first_name[0]}{selectedCustomer.last_name?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">
                                                {selectedCustomer.first_name} {selectedCustomer.last_name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                ID: {selectedCustomer.id.slice(0, 8)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-border">
                                        {selectedCustomer.phone && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Phone size={14} className="text-primary" />
                                                {selectedCustomer.phone}
                                            </div>
                                        )}
                                        {selectedCustomer.email && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail size={14} className="text-primary" />
                                                {selectedCustomer.email}
                                            </div>
                                        )}
                                        {selectedCustomer.address_raw && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin size={14} className="text-primary mt-0.5" />
                                                <span className="text-muted-foreground">
                                                    {selectedCustomer.address_raw}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                                        <div className="pt-2 border-t border-border">
                                            <p className="text-xs text-muted-foreground mb-2">Etiquetas</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedCustomer.tags.map(tag => {
                                                    const IconComponent = TAG_ICONS[tag.icon || "Tag"] || TAG_ICONS["Tag"];
                                                    return (
                                                        <span
                                                            key={tag.id}
                                                            className="h-7 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-medium border"
                                                            style={{
                                                                backgroundColor: `${tag.color}15`,
                                                                color: tag.color,
                                                                borderColor: `${tag.color}30`
                                                            }}
                                                        >
                                                            <IconComponent size={12} />
                                                            {tag.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Users size={18} className="text-primary" />
                                        Resumen
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-primary/5 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold text-primary">{customersWithLocation.length}</p>
                                            <p className="text-xs text-muted-foreground">Con ubicación</p>
                                        </div>
                                        <div className="bg-muted rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold">{customersWithoutLocation}</p>
                                            <p className="text-xs text-muted-foreground">Sin ubicación</p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        Haz clic en un marcador del mapa para ver los detalles del cliente.
                                    </p>

                                    {customersWithoutLocation > 0 && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                            <p className="text-xs text-amber-600">
                                                {customersWithoutLocation} cliente(s) sin dirección configurada no aparecen en el mapa.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
