"use client";

import { useEffect, useState } from "react";
import { FloorProvider, FloorManagerModal } from "@/features/floor-plan";

export function GlobalFloorProviderWrapper({ children }: { children: React.ReactNode }) {
    const [restaurantId, setRestaurantId] = useState<string>("");
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Poll for cookie changes
        const checkCookie = () => {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            const newId = match ? match[2] : "";
            if (newId !== restaurantId) {
                setRestaurantId(newId);
            }
            if (!isReady) {
                setIsReady(true);
            }
        };

        checkCookie(); // Initial check
        const interval = setInterval(checkCookie, 1000); // Poll every second

        return () => clearInterval(interval);
    }, [restaurantId, isReady]);

    // Always render FloorProvider to maintain hook consistency
    // FloorProvider handles empty restaurantId gracefully (won't fetch floors)
    return (
        <FloorProvider restaurantId={restaurantId}>
            {restaurantId && <FloorManagerModal restaurantId={restaurantId} />}
            {children}
        </FloorProvider>
    );
}

