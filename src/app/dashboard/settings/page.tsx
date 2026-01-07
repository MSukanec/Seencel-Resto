"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-utils";
import { Loader2, Upload, Save, MapPin, DollarSign, Store, Globe } from "lucide-react";
import Image from "next/image";
import { Armchair } from "lucide-react";

interface RestaurantSettings {
    name: string;
    slug: string;
    address: string | null;
    currency: string;
    logo_url: string | null;
}

interface FloorEditorSettings {
    chair_spacing_cm: number;
    default_table_size_cm: number;
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [settings, setSettings] = useState<RestaurantSettings>({
        name: "",
        slug: "",
        address: "",
        currency: "USD",
        logo_url: null,
    });
    const [floorSettings, setFloorSettings] = useState<FloorEditorSettings>({
        chair_spacing_cm: 60,
        default_table_size_cm: 70,
    });
    const [savingFloor, setSavingFloor] = useState(false);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    useEffect(() => {
        initializePage();
    }, []);

    // --- ID Resolution Strategy (Same as Architecture Page) ---
    const initializePage = async () => {
        const id = await resolveRestaurantId();
        if (id) {
            setRestaurantId(id);
            fetchSettings(id);
            fetchFloorSettings(id);
        } else {
            setLoading(false);
        }
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
    // ---------------------------------------------------------

    const fetchSettings = async (id: string) => {
        const { data, error } = await supabase
            .from("restaurants")
            .select("name, slug, address, currency, logo_url")
            .eq("id", id)
            .single();

        if (data) {
            setSettings({
                name: data.name,
                slug: data.slug,
                address: data.address || "",
                currency: data.currency || "USD",
                logo_url: data.logo_url
            });
        }
        setLoading(false);
    };

    const fetchFloorSettings = async (id: string) => {
        const { data } = await supabase
            .from("restaurant_settings")
            .select("chair_spacing_cm, default_table_size_cm")
            .eq("restaurant_id", id)
            .single();

        if (data) {
            setFloorSettings({
                chair_spacing_cm: data.chair_spacing_cm || 60,
                default_table_size_cm: data.default_table_size_cm || 70
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurantId) return;

        setSaving(true);
        const { error } = await supabase
            .from("restaurants")
            .update({
                name: settings.name,
                address: settings.address,
                currency: settings.currency,
                // Slug updates might be complex due to URL changes, but allowing for now on DB level
            })
            .eq("id", restaurantId);

        if (error) {
            alert("Error al guardar cambios");
            console.error(error);
        } else {
            alert("Cambios guardados correctamente");
        }
        setSaving(false);
    };

    const handleSaveFloorSettings = async () => {
        if (!restaurantId) return;

        setSavingFloor(true);
        const { error } = await supabase
            .from("restaurant_settings")
            .update({
                chair_spacing_cm: floorSettings.chair_spacing_cm,
                default_table_size_cm: floorSettings.default_table_size_cm,
                updated_at: new Date().toISOString()
            })
            .eq("restaurant_id", restaurantId);

        if (error) {
            alert("Error al guardar configuración del editor");
            console.error(error);
        } else {
            alert("Configuración guardada correctamente");
        }
        setSavingFloor(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !restaurantId) return;
        const file = e.target.files[0];

        setUploading(true);

        try {
            // 1. Client-side optimization
            console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
            const optimizedFile = await compressImage(file, 600, 0.8); // 600px max width, 80% quality
            console.log(`Optimized size: ${(optimizedFile.size / 1024).toFixed(2)} KB`);

            // 2. Upload to Supabase Storage
            const timestamp = Date.now();
            const filePath = `${restaurantId}/${timestamp}.jpg`;

            const { error: uploadError } = await supabase
                .storage
                .from('logos')
                .upload(filePath, optimizedFile, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from('logos')
                .getPublicUrl(filePath);

            // 4. Update DB
            const { error: dbError } = await supabase
                .from("restaurants")
                .update({ logo_url: publicUrl })
                .eq("id", restaurantId);

            if (dbError) throw dbError;

            // 5. Update Local State
            setSettings(prev => ({ ...prev, logo_url: publicUrl }));
            alert("Logo actualizado correctamente");

        } catch (error: any) {
            console.error("Upload failed:", error);
            alert(`Error al subir imagen: ${error.message}`);
        } finally {
            setUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

    if (!restaurantId) return <div className="p-8 text-center bg-card m-8 rounded-xl shadow border border-border">No se encontró el restaurante.</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuración</h1>
                <p className="text-muted-foreground mt-2">Administra la identidad y preferencias de <span className="font-semibold text-foreground">{settings.name}</span></p>
            </header>

            {/* Logo Section */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Upload size={20} className="text-primary" /> Identidad Visual
                </h2>
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
                                    unoptimized // Allow external Supabase URLs easily
                                />
                            ) : (
                                <Store size={48} className="text-muted-foreground" />
                            )}

                            {/* Overlay */}
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
                            Sube una imagen (JPG, PNG). Será optimizada automáticamente para web.
                            Resolución recomendada: 500x500px.
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

            {/* General Settings Form */}
            <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    {/* Slug (Read only recommendation usually, but user allowed edit conceptually) */}
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

                    {/* Address */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-foreground">Dirección</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-muted-foreground" size={18} />
                            <input
                                name="address"
                                value={settings.address || ""}
                                onChange={handleInputChange}
                                className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                                placeholder="Dirección del local"
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

                <div className="pt-4 flex justify-end border-t border-border">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </form>

            {/* Floor Editor Settings */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Armchair size={20} className="text-primary" /> Editor de Planos
                </h2>
                <p className="text-sm text-muted-foreground">
                    Configura cómo se distribuyen las sillas en las mesas del plano.
                </p>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Silla cada (cm)</label>
                        <p className="text-xs text-muted-foreground">
                            Define cada cuántos centímetros se agrega una silla extra por lado. Ej: 60cm = 1 silla hasta 119cm, 2 sillas desde 120cm.
                        </p>
                        <input
                            type="number"
                            min={30}
                            max={150}
                            step={5}
                            value={floorSettings.chair_spacing_cm}
                            onChange={(e) => setFloorSettings(prev => ({ ...prev, chair_spacing_cm: Number(e.target.value) }))}
                            className="w-32 bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Tamaño de Mesa por Defecto (cm)</label>
                        <p className="text-xs text-muted-foreground">
                            Tamaño inicial al agregar nuevas mesas (ancho/alto/diámetro).
                        </p>
                        <input
                            type="number"
                            min={40}
                            max={200}
                            step={5}
                            value={floorSettings.default_table_size_cm}
                            onChange={(e) => setFloorSettings(prev => ({ ...prev, default_table_size_cm: Number(e.target.value) }))}
                            className="w-32 bg-background border border-border rounded-xl py-2.5 px-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-border">
                    <button
                        type="button"
                        disabled={savingFloor}
                        onClick={handleSaveFloorSettings}
                        className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:brightness-110 transition-all shadow-md disabled:opacity-50"
                    >
                        {savingFloor ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {savingFloor ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </section>
        </div>
    );
}
