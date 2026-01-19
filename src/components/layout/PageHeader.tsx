"use client";

import { LucideIcon, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { useMobileSidebar } from "@/components/providers/MobileSidebarContext";

interface PageHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    className?: string;
    iconColor?: string;
}

export function PageHeader({
    icon: Icon,
    title,
    subtitle,
    actions,
    className,
    iconColor = "bg-primary/10 text-primary"
}: PageHeaderProps) {
    const { open } = useMobileSidebar();

    return (
        <div className={cn(
            "flex h-16 items-center justify-between px-4 md:px-8 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10",
            className
        )}>
            <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                    onClick={open}
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground"
                    aria-label="Abrir menú"
                >
                    <Menu size={22} />
                </button>

                <div className={cn("p-2 rounded-lg hidden md:flex", iconColor)}>
                    <Icon size={24} />
                </div>
                <div>
                    <h1 className="text-lg md:text-xl font-bold">{title}</h1>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground hidden md:block">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Desktop actions */}
            {actions && (
                <div className="hidden md:flex items-center gap-3">
                    {actions}
                </div>
            )}

            {/* Mobile actions - more compact */}
            {actions && (
                <div className="md:hidden flex items-center">
                    {actions}
                </div>
            )}
        </div>
    );
}
