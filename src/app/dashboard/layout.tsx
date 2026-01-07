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
                    {/* Top Header */}
                    <header className="flex h-16 items-center justify-between border-b border-border bg-background/50 px-6 backdrop-blur-sm">
                        <Breadcrumbs />
                        <div className="flex items-center gap-4">
                            <button className="relative rounded-full bg-accent p-2 text-accent-foreground hover:bg-accent/80 transition-colors">
                                <Bell size={20} />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                            </button>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-emerald-500 ring-2 ring-border"></div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </GlobalFloorProviderWrapper>
        </div>
    );
}
