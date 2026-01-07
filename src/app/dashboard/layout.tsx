import { Sidebar } from "@/components/sidebar";
import { Bell } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalFloorProviderWrapper } from "@/components/providers/GlobalFloorProviderWrapper";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <GlobalFloorProviderWrapper>
                {/* Sidebar - Hidden on mobile for now, displayed on md+ */}
                <Sidebar className="hidden md:flex" />

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Top Header Removed - Optimized Layout */}

                    {/* Page Content */}

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </GlobalFloorProviderWrapper>
        </div>
    );
}
