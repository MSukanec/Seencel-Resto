"use client";

import { useEffect, useState } from "react";
import { FloorProvider } from "@/contexts/FloorContext";
import { FloorManagerModal } from "@/components/floor-plan/FloorManagerModal";

export function GlobalFloorProviderWrapper({ children }: { children: React.ReactNode }) {
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        // Poll for cookie changes
        const checkCookie = () => {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const newId = match ? match[2] : null;
            if (newId !== restaurantId) {
                setRestaurantId(newId);
            }
        };

        checkCookie(); // Initial check
        const interval = setInterval(checkCookie, 1000); // Poll every second

        return () => clearInterval(interval);
    }, [restaurantId]);

    if (!restaurantId) {
        // Provide context with dummy ID or render null if strictly required?
        // Rendering children is better so UI doesn't flicker, but Context needs ID.
        // Let's render children without provider if no ID, or provider with empty ID.
        // FloorProvider checks "if (restaurantId) refreshFloors()", so passing "" is safe-ish but queries might fail.
        return <>{children}</>;
    }

    return (
        <FloorProvider restaurantId={restaurantId}>
            <FloorManagerModal restaurantId={restaurantId} />
            {children}
        </FloorProvider>
    );
}
