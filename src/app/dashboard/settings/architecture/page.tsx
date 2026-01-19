"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { FloorArchitectureCanvas } from "@/features/floor-plan";

export default function ArchitecturePage() {
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        if (match) setRestaurantId(match[2]);
    }, []);

    if (!restaurantId) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Cargando...</div>;
    }

    return <FloorArchitectureCanvas restaurantId={restaurantId} />;
}
