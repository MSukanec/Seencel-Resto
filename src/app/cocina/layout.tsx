"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SIDEBAR_COCINA } from "@/components/layout/sidebar-config";
import { ConfirmProvider } from "@/components/ui/confirm-modal";

export default function CocinaLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <ConfirmProvider>
                <AppSidebar variant={SIDEBAR_COCINA} className="hidden md:flex" />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </ConfirmProvider>
        </div>
    );
}
