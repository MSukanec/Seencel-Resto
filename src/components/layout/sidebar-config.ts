import {
    LayoutDashboard,
    Map,
    ChefHat,
    Users,
    Settings,
    UtensilsCrossed,
    Calendar,
    Tag,
    PencilRuler,
    Armchair,
    FileSpreadsheet,
    BookOpen,
    ClipboardList,
    History,
    Utensils,
    Home,
    Receipt,
    List,
    MapPin,
    Menu as MenuIcon
} from "lucide-react";
import { SidebarVariant } from "./AppSidebar";

// =====================
// RESTO (Propietario/Encargado)
// =====================
export const SIDEBAR_RESTO: SidebarVariant = {
    name: "Resto",
    accentClass: "bg-primary",
    icon: ChefHat,
    items: [
        { icon: LayoutDashboard, label: "Panel", href: "/dashboard/overview" },
        { icon: Calendar, label: "Calendario", href: "/dashboard/calendar" },
        { icon: UtensilsCrossed, label: "Pedidos", href: "/dashboard/orders" },
        {
            icon: ChefHat,
            label: "Menú",
            href: "#",
            subItems: [
                { icon: BookOpen, label: "Carta", href: "/dashboard/menu/editor" },
                { icon: MenuIcon, label: "Menús", href: "/dashboard/menu/menus" },
                { icon: FileSpreadsheet, label: "Importar", href: "/dashboard/menu/import" },
            ]
        },
        {
            icon: Users,
            label: "Clientes",
            href: "#",
            subItems: [
                { icon: List, label: "Lista", href: "/dashboard/customers/list" },
                { icon: MapPin, label: "Mapa", href: "/dashboard/customers/map" },
            ]
        },
        {
            icon: Settings,
            label: "Configuración",
            href: "#",
            subItems: [
                { icon: Settings, label: "Ajustes", href: "/dashboard/settings/general" },
                { icon: Users, label: "Equipo", href: "/dashboard/settings/team" },
                { icon: Tag, label: "Etiquetas", href: "/dashboard/settings/tags" },
                { icon: ChefHat, label: "Sectores", href: "/dashboard/settings/sectors" },
                { icon: PencilRuler, label: "Arquitectura", href: "/dashboard/settings/architecture" },
                { icon: Armchair, label: "Plantillas", href: "/dashboard/settings/templates" },
            ]
        },
    ]
};

// =====================
// COCINA
// =====================
export const SIDEBAR_COCINA: SidebarVariant = {
    name: "Cocina",
    accentClass: "bg-teal-500",
    icon: ChefHat,
    items: [
        { icon: ClipboardList, label: "Comandas", href: "/cocina" },
        { icon: History, label: "Historial", href: "/cocina/historial" },
    ]
};

// =====================
// MOZO
// =====================
export const SIDEBAR_MOZO: SidebarVariant = {
    name: "Mozo",
    accentClass: "bg-blue-500",
    icon: Utensils,
    items: [
        { icon: Home, label: "Mesas", href: "/waiter" },
        { icon: Receipt, label: "Mis Pedidos", href: "/waiter/orders" },
    ]
};
