import {
    Wheat,
    Carrot,
    Leaf,
    Milk,
    Fish,
    Nut,
    Flame,
    XCircle,
    Accessibility, // Use Accessibility instead of Wheelchair
    Baby,
    Armchair,
    Cake,
    Heart,
    Wine,
    Briefcase,
    Sun,
    Wind,
    AppWindow,
    Crown,
    Star,
    Repeat,
    Utensils,
    HelpCircle,
    Zap,
    Gift,
    PartyPopper,
    Coffee,
    Pizza,
    Beer,
    Martini,
    Music,
    Dog,
    ThermometerSun,
    ThermometerSnowflake,
    VolumeX
} from "lucide-react";

export const TAG_ICONS: Record<string, any> = {
    // Dietary
    "WheatOff": Wheat,
    "Wheat": Wheat,
    "Carrot": Carrot,
    "Leaf": Leaf,
    "MilkOff": Milk,
    "Milk": Milk,
    "FishOff": Fish,
    "Fish": Fish,
    "NutOff": Nut,
    "Nut": Nut,
    "ShakerOff": XCircle,
    "Flame": Flame,

    // Accessibility
    "Wheelchair": Accessibility, // Fallback to Accessibility
    "Accessibility": Accessibility,

    // Family
    "Baby": Baby,
    "Armchair": Armchair,
    "Stroller": Baby,

    // Occasion
    "Cake": Cake,
    "Heart": Heart,
    "Wine": Wine,
    "Briefcase": Briefcase,
    "Gift": Gift,
    "PartyPopper": PartyPopper,

    // Preference
    "EarOff": VolumeX,
    "Sun": Sun,
    "AppWindow": AppWindow,
    "Fan": Wind,
    "Snow": ThermometerSnowflake,
    "Fire": ThermometerSun,

    // Status
    "Crown": Crown,
    "Star": Star,
    "Repeat": Repeat,

    // Generics
    "Utensils": Utensils,
    "Coffee": Coffee,
    "Pizza": Pizza,
    "Beer": Beer,
    "Martini": Martini,
    "Pet": Dog,
    "Music": Music,
    "Tag": HelpCircle
};

export const AVAILABLE_ICONS = [
    { id: "Crown", icon: Crown, label: "VIP / Corona" },
    { id: "Star", icon: Star, label: "Estrella" },
    { id: "Heart", icon: Heart, label: "Corazón" },
    { id: "Cake", icon: Cake, label: "Torta" },
    { id: "Wine", icon: Wine, label: "Copa" },
    { id: "Beer", icon: Beer, label: "Cerveza" },
    { id: "Martini", icon: Martini, label: "Trago" },
    { id: "Coffee", icon: Coffee, label: "Café" },
    { id: "Utensils", icon: Utensils, label: "Cubiertos" },
    { id: "Carrot", icon: Carrot, label: "Zanahoria" },
    { id: "Leaf", icon: Leaf, label: "Hoja" },
    { id: "Wheat", icon: Wheat, label: "Trigo" },
    { id: "Fish", icon: Fish, label: "Pescado" },
    { id: "Flame", icon: Flame, label: "Picante" },
    { id: "Wheelchair", icon: Accessibility, label: "Silla Ruedas" },
    { id: "Baby", icon: Baby, label: "Bebé" },
    { id: "Briefcase", icon: Briefcase, label: "Maletín" },
    { id: "Sun", icon: Sun, label: "Sol" },
    { id: "Wind", icon: Wind, label: "Viento" },
    { id: "Dog", icon: Dog, label: "Mascota" },
    { id: "Music", icon: Music, label: "Música" },
    { id: "Gift", icon: Gift, label: "Regalo" },
    { id: "PartyPopper", icon: PartyPopper, label: "Fiesta" },
    { id: "Zap", icon: Zap, label: "Rayo" }
];
