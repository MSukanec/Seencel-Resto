import {
    ChefHat,
    Wine,
    Flame,
    UtensilsCrossed,
    Coffee,
} from "lucide-react";

export const SECTOR_ICONS = [
    { name: "chef-hat", icon: ChefHat, label: "Cocina" },
    { name: "wine", icon: Wine, label: "Barra" },
    { name: "flame", icon: Flame, label: "Parrilla" },
    { name: "utensils", icon: UtensilsCrossed, label: "Principal" },
    { name: "coffee", icon: Coffee, label: "Cafetería" },
];

export const SECTOR_COLORS = [
    { value: "#10b981", label: "Verde" },
    { value: "#3b82f6", label: "Azul" },
    { value: "#f59e0b", label: "Naranja" },
    { value: "#ef4444", label: "Rojo" },
    { value: "#8b5cf6", label: "Violeta" },
    { value: "#ec4899", label: "Rosa" },
];

export function getSectorIcon(iconName: string) {
    const found = SECTOR_ICONS.find((i) => i.name === iconName);
    return found?.icon ?? ChefHat;
}
