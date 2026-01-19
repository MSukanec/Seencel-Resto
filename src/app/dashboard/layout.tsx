"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SIDEBAR_RESTO } from "@/components/layout/sidebar-config";
import { GlobalFloorProviderWrapper } from "@/components/providers/GlobalFloorProviderWrapper";
import { MobileSidebarProvider } from "@/components/providers/MobileSidebarContext";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { MobileSidebarDrawer } from "@/components/layout/MobileSidebarDrawer";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MobileSidebarProvider>
            <div className="flex h-screen bg-background text-foreground overflow-hidden">
                <GlobalFloorProviderWrapper>
                    <ConfirmProvider>
                        {/* Desktop Sidebar */}
                        <AppSidebar variant={SIDEBAR_RESTO} className="hidden md:flex" />

                        {/* Mobile Sidebar Drawer */}
                        <MobileSidebarDrawer />

                        <div className="flex flex-1 flex-col overflow-hidden">
                            <main className="flex-1 overflow-auto">
                                {children}
                            </main>
                        </div>
                    </ConfirmProvider>
                </GlobalFloorProviderWrapper>
            </div>
        </MobileSidebarProvider>
    );
}
