"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

const ROUTE_LABELS: Record<string, string> = {
    dashboard: "Panel",
    floor: "Plano",
    architecture: "Arquitectura",
    tables: "Mesas",
    orders: "Pedidos",
    menu: "Menú",
    settings: "Configuración",
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="flex items-center hover:text-foreground transition-colors">
                <Home size={16} />
            </Link>
            {segments.map((segment, index) => {
                const path = `/${segments.slice(0, index + 1).join("/")}`;
                const isLast = index === segments.length - 1;
                const label = ROUTE_LABELS[segment] || segment;

                // Skip "dashboard" text if we have the home icon, or keep it? 
                // Let's keep it clean: if segment is 'dashboard' and it's the first one, maybe skip showing text if we have icon?
                // But usually Dashboard > Something is good.
                // Actually, if I click Home, I go to /dashboard.
                if (segment === "dashboard") return null;

                return (
                    <Fragment key={path}>
                        <ChevronRight size={14} />
                        {isLast ? (
                            <span className="font-medium text-foreground">{label}</span>
                        ) : (
                            <Link href={path} className="hover:text-foreground transition-colors">
                                {label}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
