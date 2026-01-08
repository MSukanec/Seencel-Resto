import { LiveFloorPlan } from "@/components/dashboard/LiveFloorPlan";
import { Users, DollarSign, ShoppingBag, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const stats = [
        { label: "Ingresos Totales", value: "$45,231.89", icon: DollarSign, trend: "+20.1% vs mes pasado" },
        { label: "Pedidos Activos", value: "+12", icon: ShoppingBag, trend: "+4 última hora" },
        { label: "Personal Activo", value: "8", icon: Users, trend: "Turno completo" },
        { label: "Ocupación de Mesas", value: "85%", icon: Activity, trend: "+12% vs ayer" },
    ];

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Compact Header with Integrated KPIs */}
            <div className="flex h-16 items-center justify-between px-6 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10 shrink-0 gap-4">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Panel</h1>
                        <p className="text-xs text-muted-foreground">Resumen en tiempo real</p>
                    </div>
                </div>

                {/* Horizontal KPIs Scrollable if needed */}
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar mask-gradient-x flex-1 justify-end">
                    {stats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                            </div>
                            <div className={cn(
                                "flex flex-col text-[10px] mobile-hidden",
                                stat.trend.includes('+') ? "text-emerald-500" : "text-muted-foreground"
                            )}>
                                <span className="font-bold">{stat.trend.split(' ')[0]}</span>
                                <stat.icon size={14} className="opacity-50 ml-auto" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Full Screen Floor Plan */}
            <div className="flex-1 overflow-hidden relative">
                <LiveFloorPlan />
            </div>
        </div>
    );
}
