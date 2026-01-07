import {
    Users,
    DollarSign,
    ShoppingBag,
    Activity
} from "lucide-react";

export default function DashboardPage() {
    const stats = [
        { label: "Ingresos Totales", value: "$45,231.89", icon: DollarSign, trend: "+20.1% vs mes pasado" },
        { label: "Pedidos Activos", value: "+12", icon: ShoppingBag, trend: "+4 última hora" },
        { label: "Personal Activo", value: "8", icon: Users, trend: "Turno completo" },
        { label: "Ocupación de Mesas", value: "85%", icon: Activity, trend: "+12% vs ayer" },
    ];

    return (
        <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <div className="rounded-full bg-primary/10 p-2 text-primary">
                                <stat.icon size={16} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.trend}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Main Chart Area (Mock) */}
                <div className="col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Ingresos Semanales</h3>
                        <p className="text-sm text-muted-foreground">Resumen de tu rendimiento.</p>
                    </div>
                    <div className="h-[300px] w-full items-end justify-between gap-2 overflow-hidden rounded-md flex pl-4 pb-4">
                        {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                            <div key={i} className="relative w-full group">
                                <div
                                    className="w-full rounded-t-sm bg-primary/20 transition-all hover:bg-primary cursor-pointer hover:shadow-[0_0_20px_-5px_var(--primary)]"
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Sales/Activity */}
                <div className="col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
                        <p className="text-sm text-muted-foreground">Últimas transacciones y movimientos.</p>
                    </div>
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-accent/50 flex items-center justify-center text-xs font-bold text-foreground">
                                        M{i + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none text-foreground">Mesa {i + 5}</p>
                                        <p className="text-xs text-muted-foreground">hace 2 min</p>
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-foreground">
                                    +${((i + 1) * 12.34).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
