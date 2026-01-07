"use client";

import { FloorProvider } from "@/contexts/FloorContext";
import { useEffect, useState } from "react";
import { FloorManagerModal } from "@/components/floor-plan/FloorManagerModal";

export default function FloorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        const checkCookie = () => {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const currentId = match ? match[2] : null;
            if (currentId && currentId !== restaurantId) {
                setRestaurantId(currentId);
            }
        };

        // Initial check
        checkCookie();

        // Check every 1s
        const interval = setInterval(checkCookie, 1000);
        return () => clearInterval(interval);
    }, [restaurantId]);

    if (!restaurantId) {
        return <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Cargando...</p>
        </div>;
    }

    return (
        <FloorProvider restaurantId={restaurantId}>
            <FloorManagerModal restaurantId={restaurantId} />
            {children}
        </FloorProvider>
    );
}
