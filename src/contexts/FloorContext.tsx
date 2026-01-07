"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Floor, getFloorsForRestaurant } from "@/lib/supabase/floor-queries";

interface FloorModalState {
    isOpen: boolean;
    mode: "create" | "edit" | "delete" | null;
    floor: Floor | null;
}

interface FloorContextType {
    floors: Floor[];
    selectedFloor: Floor | null;
    selectedFloorId: string | null;
    setSelectedFloorId: (id: string) => void;
    refreshFloors: () => Promise<void>;
    isLoading: boolean;
    // Modal Control
    modalState: FloorModalState;
    openModal: (mode: "create" | "edit" | "delete", floor?: Floor) => void;
    closeModal: () => void;
}

const FloorContext = createContext<FloorContextType | undefined>(undefined);

interface FloorProviderProps {
    children: ReactNode;
    restaurantId: string;
}

export function FloorProvider({ children, restaurantId }: FloorProviderProps) {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [modalState, setModalState] = useState<FloorModalState>({
        isOpen: false,
        mode: null,
        floor: null
    });

    const selectedFloor = floors.find(f => f.id === selectedFloorId) || null;

    const openModal = (mode: "create" | "edit" | "delete", floor?: Floor) => {
        setModalState({
            isOpen: true,
            mode,
            floor: floor || null
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: null,
            floor: null
        });
    };

    const refreshFloors = async () => {
        setIsLoading(true);
        try {
            // Get all floors
            const { data: allFloors } = await getFloorsForRestaurant(restaurantId);

            if (allFloors) {
                setFloors(allFloors);

                // Auto-select first floor if none selected and floors exist
                if (!selectedFloorId && allFloors.length > 0) {
                    setSelectedFloorId(allFloors[0].id);
                } else if (allFloors.length === 0) {
                    setSelectedFloorId(null);
                }
            }
        } catch (error) {
            console.error("Error loading floors:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (restaurantId) {
            refreshFloors();
        }
    }, [restaurantId]);

    return (
        <FloorContext.Provider
            value={{
                floors,
                selectedFloor,
                selectedFloorId,
                setSelectedFloorId,
                refreshFloors,
                isLoading,
                modalState,
                openModal,
                closeModal
            }}
        >
            {children}
        </FloorContext.Provider>
    );
}

export function useFloor() {
    const context = useContext(FloorContext);
    if (context === undefined) {
        throw new Error("useFloor must be used within a FloorProvider");
    }
    return context;
}
