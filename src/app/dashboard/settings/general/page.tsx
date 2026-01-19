"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { Loader2, Upload, DollarSign, Store, Globe, Save, Settings, Ruler, Calendar, Clock, ShoppingBag, Percent, ImageIcon } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddressInputWithMap } from "@/components/maps";

interface RestaurantSettings {
    name: string;
    slug: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    google_place_id: string | null;
    currency: string;
    logo_url: string | null;
    banner_url: string | null;
}

interface FloorSettings {
    chair_spacing_cm: number;
    default_table_size_cm: number;
    reservation_interval_minutes: number;
    min_reservation_time_hours: number;
    max_reservation_time_days: number;
    // Order discounts
    dine_in_discount: number;
    dine_in_discount_label: string;
    pickup_discount: number;
    pickup_discount_label: string;
    delivery_discount: number;
    delivery_discount_label: string;
}

interface OperatingSchedule {
    day_of_week: number;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingFloor, setSavingFloor] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    const [settings, setSettings] = useState<RestaurantSettings>({
        name: "",
        slug: "",
        address: "",
        latitude: null,
        longitude: null,
        google_place_id: null,
        currency: "USD",
        logo_url: null,
        banner_url: null,
    });

    const [floorSettings, setFloorSettings] = useState<FloorSettings>({
        chair_spacing_cm: 50,
        default_table_size_cm: 80,
        reservation_interval_minutes: 30,
        min_reservation_time_hours: 2,
        max_reservation_time_days: 30,
        dine_in_discount: 0,
        dine_in_discount_label: "",
        pickup_discount: 0,
        pickup_discount_label: "",
        delivery_discount: 0,
        delivery_discount_label: "",
    });

    const [operatingSchedules, setOperatingSchedules] = useState<OperatingSchedule[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    useEffect(() => {
        initializePage();
    }, []);

    const initializePage = async () => {
        const id = await resolveRestaurantId();
        if (id) {
            setRestaurantId(id);
            await Promise.all([
                fetchSettings(id),
                fetchFloorSettings(id),
                fetchOperatingSchedules(id)
            ]);
        }
        setLoading(false);
    };

    const resolveRestaurantId = async (): Promise<string | null> => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        if (match && match[2]) return match[2];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", user.id)
            .limit(1);

        return data?.[0]?.id || null;
    };

    const fetchSettings = async (id: string) => {
        const { data } = await supabase
            .from("restaurants")
            .select("name, slug, address, latitude, longitude, google_place_id, currency, logo_url, banner_url")
            .eq("id", id)
            .single();

        if (data) {
            setSettings({
                name: data.name,
                slug: data.slug,
                address: data.address || "",
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                google_place_id: data.google_place_id || null,
                currency: data.currency || "USD",
                logo_url: data.logo_url,
                banner_url: data.banner_url
            });
        }
    };

    const fetchFloorSettings = async (id: string) => {
        const { data } = await supabase
            .from("restaurant_settings")
            .select("chair_spacing_cm, default_table_size_cm, reservation_interval_minutes, min_reservation_time_hours, max_reservation_time_days, dine_in_discount, dine_in_discount_label, pickup_discount, pickup_discount_label, delivery_discount, delivery_discount_label")
            .eq("restaurant_id", id)
            .single();

        if (data) {
            setFloorSettings({
                chair_spacing_cm: data.chair_spacing_cm || 50,
                default_table_size_cm: data.default_table_size_cm || 80,
                reservation_interval_minutes: data.reservation_interval_minutes || 30,
                min_reservation_time_hours: data.min_reservation_time_hours || 2,
                max_reservation_time_days: data.max_reservation_time_days || 30,
                dine_in_discount: data.dine_in_discount || 0,
                dine_in_discount_label: data.dine_in_discount_label || "",
                pickup_discount: data.pickup_discount || 0,
                pickup_discount_label: data.pickup_discount_label || "",
                delivery_discount: data.delivery_discount || 0,
                delivery_discount_label: data.delivery_discount_label || "",
            });
        }
    };

    const fetchOperatingSchedules = async (id: string) => {
        const { data } = await supabase
            .from("operating_schedules")
            .select("day_of_week, is_closed, open_time, close_time")
            .eq("restaurant_id", id)
            .order("day_of_week", { ascending: true });

        if (data && data.length > 0) {
            setOperatingSchedules(data);
        } else {
            // Default schedule: Mon-Sat open 12:00-23:00, Sunday closed
            const defaultSchedule = DAY_NAMES.map((_, i) => ({
                day_of_week: i,
                is_closed: i === 0, // Sunday closed
                open_time: "12:00",
                close_time: "23:00"
            }));
            setOperatingSchedules(defaultSchedule);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleFloorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFloorSettings(prev => ({ ...prev, [name]: Number(value) }));
    };

    const toggleDayOpen = (dayIndex: number) => {
        setOperatingSchedules(prev => prev.map(schedule =>
            schedule.day_of_week === dayIndex
                ? { ...schedule, is_closed: !schedule.is_closed }
                : schedule
        ));
    };

    const handleSaveAll = async () => {
        if (!restaurantId) return;

        setSaving(true);
        try {
            // 1. Save restaurant settings
            const { error: restError } = await supabase
                .from("restaurants")
                .update({
                    name: settings.name,
                    address: settings.address,
                    latitude: settings.latitude,
                    longitude: settings.longitude,
                    google_place_id: settings.google_place_id,
                    currency: settings.currency,
                })
                .eq("id", restaurantId);

            if (restError) throw restError;

            // 2. Save floor/reservation settings
            const { error: floorError } = await supabase
                .from("restaurant_settings")
                .update({
                    chair_spacing_cm: floorSettings.chair_spacing_cm,
                    default_table_size_cm: floorSettings.default_table_size_cm,
                    reservation_interval_minutes: floorSettings.reservation_interval_minutes,
                    min_reservation_time_hours: floorSettings.min_reservation_time_hours,
                    max_reservation_time_days: floorSettings.max_reservation_time_days,
                    dine_in_discount: floorSettings.dine_in_discount,
                    dine_in_discount_label: floorSettings.dine_in_discount_label || null,
                    pickup_discount: floorSettings.pickup_discount,
                    pickup_discount_label: floorSettings.pickup_discount_label || null,
                    delivery_discount: floorSettings.delivery_discount,
                    delivery_discount_label: floorSettings.delivery_discount_label || null,
                    updated_at: new Date().toISOString()
                })
                .eq("restaurant_id", restaurantId);

            if (floorError) throw floorError;

            // 3. Save operating schedules - delete and recreate for reliability
            await supabase
                .from("operating_schedules")
                .delete()
                .eq("restaurant_id", restaurantId);

            const scheduleInserts = operatingSchedules.map(schedule => ({
                restaurant_id: restaurantId,
                day_of_week: schedule.day_of_week,
                is_closed: schedule.is_closed,
                open_time: schedule.open_time,
                close_time: schedule.close_time
            }));

            const { error: scheduleError } = await supabase
                .from("operating_schedules")
                .insert(scheduleInserts);

            if (scheduleError) throw scheduleError;

            alert("Todos los cambios guardados correctamente");
        } catch (err) {
            alert("Error al guardar cambios");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !restaurantId) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const compressedBlob = await compressImage(file, 500, 0.8);
            const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });

            const filePath = `${restaurantId}/logo_${Date.now()}.webp`;
            const { error: uploadError } = await supabase.storage
                .from("logos")
                .upload(filePath, compressedFile, { cacheControl: "3600", upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from("restaurants")
                .update({ logo_url: publicUrl })
                .eq("id", restaurantId);

            if (updateError) throw updateError;

            setSettings(prev => ({ ...prev, logo_url: publicUrl }));
            alert("Logo actualizado correctamente");

        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Error al subir imagen: ${error.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !restaurantId) return;
        const file = e.target.files[0];

        setUploadingBanner(true);
        try {
            const compressedBlob = await compressImage(file, 1200, 0.85);
            const compressedFile = new File([compressedBlob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });

            const filePath = `${restaurantId}/banner_${Date.now()}.webp`;
            const { error: uploadError } = await supabase.storage
                .from("logos")
                .upload(filePath, compressedFile, { cacheControl: "3600", upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
            const publicUrl = urlData.publicUrl;

            const { error: updateError } = await supabase
                .from("restaurants")
                .update({ banner_url: publicUrl })
                .eq("id", restaurantId);

            if (updateError) throw updateError;

            setSettings(prev => ({ ...prev, banner_url: publicUrl }));
            alert("Banner actualizado correctamente");

        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Error al subir imagen: ${error.message}`);
        } finally {
            setUploadingBanner(false);
            if (bannerInputRef.current) bannerInputRef.current.value = "";
        }
    };

    if (loading) return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Settings}
                title="Ajustes"
                subtitle="Cargando..."
            />
            <div className="flex items-center justify-center flex-1">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        </div>
    );

    if (!restaurantId) return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Settings}
                title="Ajustes"
                subtitle="Error"
            />
            <div className="p-8 text-center bg-card m-8 rounded-xl shadow border border-border">No se encontró el restaurante.</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={Settings}
                title="Ajustes"
                subtitle={`Configuración general de ${settings.name}`}
                actions={
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                }
            />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Identidad Visual */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Upload size={20} className="text-primary" /> Identidad Visual
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Logo y branding de tu restaurante.
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group hover:cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted group-hover:border-primary/50 transition-colors bg-muted flex items-center justify-center">
                                    {settings.logo_url ? (
                                        <Image
                                            src={settings.logo_url}
                                            alt="Restaurante Logo"
                                            width={128}
                                            height={128}
                                            className="object-cover w-full h-full"
                                            unoptimized
                                        />
                                    ) : (
                                        <Store size={48} className="text-muted-foreground" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                        <Upload className="text-white" size={24} />
                                    </div>
                                </div>
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-medium text-foreground mb-2">Logo del Restaurante</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Sube una imagen (JPG, PNG). Será optimizada automáticamente. Resolución recomendada: 500x500px.
                                </p>
                                <button
                                    type="button"
                                    disabled={uploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors border border-border"
                                >
                                    {uploading ? "Subiendo..." : "Cambiar Imagen"}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleLogoUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Banner / Hero Image */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <ImageIcon size={20} className="text-primary" /> Banner / Hero
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Imagen de portada para la vista de clientes.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div
                                className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-dashed border-muted group hover:border-primary/50 transition-colors cursor-pointer bg-muted flex items-center justify-center"
                                onClick={() => bannerInputRef.current?.click()}
                            >
                                {settings.banner_url ? (
                                    <Image
                                        src={settings.banner_url}
                                        alt="Banner"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ImageIcon size={48} />
                                        <span className="text-sm">Click para subir banner</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="text-white" size={32} />
                                </div>
                                {uploadingBanner && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                        <Loader2 className="animate-spin text-primary" size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Resolución recomendada: 1200x400px. Se usa como hero en pedidos.
                                </p>
                                <button
                                    type="button"
                                    disabled={uploadingBanner}
                                    onClick={() => bannerInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors border border-border"
                                >
                                    {uploadingBanner ? "Subiendo..." : "Cambiar Banner"}
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={bannerInputRef}
                                onChange={handleBannerUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </section>

                    {/* Información General */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Store size={20} className="text-primary" /> Información General
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Datos básicos de tu restaurante.
                            </p>
                        </div>

                        {/* Row 1: Name, Slug, Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Nombre</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-3 text-muted-foreground" size={18} />
                                    <input
                                        name="name"
                                        value={settings.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                                        placeholder="Nombre comercial"
                                    />
                                </div>
                            </div>

                            {/* Slug */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Slug (URL)</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-3 text-muted-foreground" size={18} />
                                    <input
                                        name="slug"
                                        value={settings.slug}
                                        disabled
                                        title="Contacte soporte para cambiar el slug"
                                        className="w-full bg-muted border border-border rounded-xl py-2.5 pl-10 pr-4 text-muted-foreground cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Currency */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Moneda</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 text-muted-foreground" size={18} />
                                    <select
                                        name="currency"
                                        value={settings.currency}
                                        onChange={handleInputChange}
                                        className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                                    >
                                        <option value="USD">USD - Dólar Estadounidense</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="ARS">ARS - Peso Argentino</option>
                                        <option value="MXN">MXN - Peso Mexicano</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Address with Google Places + Mini Map */}
                        <AddressInputWithMap
                            value={settings.address || ""}
                            latitude={settings.latitude}
                            longitude={settings.longitude}
                            onChange={(address, lat, lng, placeId) => {
                                setSettings(prev => ({
                                    ...prev,
                                    address,
                                    latitude: lat,
                                    longitude: lng,
                                    google_place_id: placeId
                                }));
                            }}
                            placeholder="Buscar dirección del restaurante..."
                            label="Dirección"
                        />
                    </section>

                    {/* Editor de Planos */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Ruler size={20} className="text-primary" /> Editor de Planos
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configuración de dimensiones y espaciado para el diseño de mesas.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Espacio entre sillas (cm)</label>
                                <input
                                    type="number"
                                    name="chair_spacing_cm"
                                    value={floorSettings.chair_spacing_cm}
                                    onChange={handleFloorInputChange}
                                    min={20}
                                    max={100}
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Tamaño predeterminado de mesa (cm)</label>
                                <input
                                    type="number"
                                    name="default_table_size_cm"
                                    value={floorSettings.default_table_size_cm}
                                    onChange={handleFloorInputChange}
                                    min={40}
                                    max={200}
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Descuentos por Tipo de Pedido */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <ShoppingBag size={20} className="text-primary" /> Descuentos por Tipo de Pedido
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configura descuentos o recargos para cada modalidad de venta. Usa valores positivos para descuentos y negativos para recargos.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Dine-in */}
                            <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Percent size={16} className="text-primary" />
                                    En el Local
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Descuento (%)</label>
                                    <input
                                        type="number"
                                        name="dine_in_discount"
                                        value={floorSettings.dine_in_discount}
                                        onChange={handleFloorInputChange}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: 10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Texto promocional</label>
                                    <input
                                        type="text"
                                        name="dine_in_discount_label"
                                        value={floorSettings.dine_in_discount_label}
                                        onChange={(e) => setFloorSettings(prev => ({ ...prev, dine_in_discount_label: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: ¡Sin cargo de servicio!"
                                    />
                                </div>
                            </div>

                            {/* Pickup */}
                            <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Percent size={16} className="text-emerald-500" />
                                    Para Retirar
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Descuento (%)</label>
                                    <input
                                        type="number"
                                        name="pickup_discount"
                                        value={floorSettings.pickup_discount}
                                        onChange={handleFloorInputChange}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: 20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Texto promocional</label>
                                    <input
                                        type="text"
                                        name="pickup_discount_label"
                                        value={floorSettings.pickup_discount_label}
                                        onChange={(e) => setFloorSettings(prev => ({ ...prev, pickup_discount_label: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: ¡20% OFF por retiro!"
                                    />
                                </div>
                            </div>

                            {/* Delivery */}
                            <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <Percent size={16} className="text-amber-500" />
                                    Delivery
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Descuento/Recargo (%)</label>
                                    <input
                                        type="number"
                                        name="delivery_discount"
                                        value={floorSettings.delivery_discount}
                                        onChange={handleFloorInputChange}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: -10 (recargo)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-muted-foreground">Texto promocional</label>
                                    <input
                                        type="text"
                                        name="delivery_discount_label"
                                        value={floorSettings.delivery_discount_label}
                                        onChange={(e) => setFloorSettings(prev => ({ ...prev, delivery_discount_label: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ej: Incluye costo de envío"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            💡 Los clientes verán estos descuentos al elegir cómo quieren su pedido.
                        </p>
                    </section>

                    {/* Configuración de Reservas */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Calendar size={20} className="text-primary" /> Configuración de Reservas
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Intervalos y rangos de tiempo para las reservas del restaurante.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Intervalo (minutos)</label>
                                <select
                                    name="reservation_interval_minutes"
                                    value={floorSettings.reservation_interval_minutes}
                                    onChange={handleFloorInputChange}
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                    <option value={60}>60 minutos</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Antelación mínima (horas)</label>
                                <input
                                    type="number"
                                    name="min_reservation_time_hours"
                                    value={floorSettings.min_reservation_time_hours}
                                    onChange={handleFloorInputChange}
                                    min={1}
                                    max={72}
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Máximo anticipación (días)</label>
                                <input
                                    type="number"
                                    name="max_reservation_time_days"
                                    value={floorSettings.max_reservation_time_days}
                                    onChange={handleFloorInputChange}
                                    min={1}
                                    max={365}
                                    className="w-full bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Días y Horarios Operativos */}
                    <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                <Clock size={20} className="text-primary" /> Horarios de Operación
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Configura los horarios de apertura y cierre para cada día.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {DAY_NAMES.map((dayName, index) => {
                                const schedule = operatingSchedules.find(s => s.day_of_week === index);
                                const isOpen = schedule ? !schedule.is_closed : false;
                                return (
                                    <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                                        {/* Day toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleDayOpen(index)}
                                            className={`
                                                w-24 px-3 py-2 rounded-lg text-sm font-medium transition-all text-center
                                                ${isOpen
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }
                                            `}
                                        >
                                            {dayName}
                                        </button>

                                        {/* Time inputs */}
                                        {isOpen ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="time"
                                                    value={schedule?.open_time || "12:00"}
                                                    onChange={(e) => {
                                                        setOperatingSchedules(prev => prev.map(s =>
                                                            s.day_of_week === index
                                                                ? { ...s, open_time: e.target.value }
                                                                : s
                                                        ));
                                                    }}
                                                    className="bg-background border border-border rounded-lg py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                                <span className="text-muted-foreground">a</span>
                                                <input
                                                    type="time"
                                                    value={schedule?.close_time || "23:00"}
                                                    onChange={(e) => {
                                                        setOperatingSchedules(prev => prev.map(s =>
                                                            s.day_of_week === index
                                                                ? { ...s, close_time: e.target.value }
                                                                : s
                                                        ));
                                                    }}
                                                    className="bg-background border border-border rounded-lg py-2 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Cerrado</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
