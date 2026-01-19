"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MobileSidebarContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | null>(null);

export function useMobileSidebar() {
    const context = useContext(MobileSidebarContext);
    if (!context) {
        throw new Error("useMobileSidebar must be used within a MobileSidebarProvider");
    }
    return context;
}

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <MobileSidebarContext.Provider
            value={{
                isOpen,
                open: () => setIsOpen(true),
                close: () => setIsOpen(false),
                toggle: () => setIsOpen(prev => !prev),
            }}
        >
            {children}
        </MobileSidebarContext.Provider>
    );
}
