"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Store } from "lucide-react";

interface Restaurant {
    id: string;
    name: string;
    logo_url: string | null;
    banner_url: string | null;
}

interface OrderContextType {
    restaurant: Restaurant | null;
}

// Context for sharing restaurant data across order pages
export const OrderContext = createContext<OrderContextType>({ restaurant: null });

export function useOrderContext() {
    return useContext(OrderContext);
}

export default function OrderLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const restaurantId = params.restaurantId as string;
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (restaurantId) {
            fetchRestaurant();
        }
    }, [restaurantId]);

    const fetchRestaurant = async () => {
        try {
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from("restaurants")
                .select("id, name, logo_url, banner_url")
                .eq("id", restaurantId)
                .single();

            if (fetchError) {
                console.error("Error fetching restaurant:", fetchError);
                setError(fetchError.message);
            } else if (data) {
                setRestaurant(data);
            }
        } catch (err) {
            console.error("Error:", err);
            setError("Error al cargar el restaurante");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (!restaurant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-6 text-center">
                <div className="p-6 bg-muted rounded-full mb-4">
                    <Store size={48} className="text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Restaurante no encontrado</h1>
                <p className="text-muted-foreground mb-4">El enlace puede estar incorrecto o el restaurante ya no existe.</p>
                {error && (
                    <p className="text-xs text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                        Error: {error}
                    </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                    ID: {restaurantId}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
            <OrderContext.Provider value={{ restaurant }}>
                {children}
            </OrderContext.Provider>
        </div>
    );
}
