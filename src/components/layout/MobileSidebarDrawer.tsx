"use client";

import { X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { SIDEBAR_RESTO } from "./sidebar-config";
import { useMobileSidebar } from "@/components/providers/MobileSidebarContext";
import { cn } from "@/lib/utils";

export function MobileSidebarDrawer() {
    const { isOpen, close } = useMobileSidebar();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={close}
                />
            )}

            {/* Drawer */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-full bg-card shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Close button */}
                <button
                    onClick={close}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground"
                >
                    <X size={20} />
                </button>

                {/* Sidebar content */}
                <AppSidebar variant={SIDEBAR_RESTO} className="h-full w-full border-r-0" onNavigate={close} isMobile />
            </div>
        </>
    );
}
