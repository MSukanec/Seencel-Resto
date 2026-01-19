"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, Upload, Columns, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { DropZone } from "@/components/ui/drop-zone";
import {
    getMenuCategories,
    createMenuCategory,
    bulkInsertMenuItems,
    parseMenuData,
    MenuCategory,
    ParsedMenuItem,
    MenuItemInsert
} from "@/lib/supabase/menu-queries";

// Step definitions
const STEPS = [
    { id: 1, title: "Subir Archivo", icon: Upload },
    { id: 2, title: "Mapear Columnas", icon: Columns },
    { id: 3, title: "Revisar Items", icon: AlertCircle },
    { id: 4, title: "Confirmar", icon: CheckCircle2 },
];

// Field mapping interface
interface ColumnMapping {
    name: string;
    description?: string;
    price: string;
    variants?: string;
    code?: string;
    category?: string;
}

export default function MenuImportPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [fileData, setFileData] = useState<string[][] | null>(null);
    const [columns, setColumns] = useState<string[]>([]);
    const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({ name: "", price: "" });
    const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
    const [useCategoryColumn, setUseCategoryColumn] = useState(false);

    const getRestaurantId = () => {
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            return match ? match[2] : null;
        }
        return null;
    };

    const restaurantId = getRestaurantId();

    useEffect(() => {
        if (restaurantId) {
            loadCategories();
        }
    }, [restaurantId]);

    const loadCategories = async () => {
        if (!restaurantId) return;
        const { data } = await getMenuCategories(restaurantId);
        if (data) {
            setCategories(data);
            if (data.length > 0 && !selectedCategoryId) {
                setSelectedCategoryId(data[0].id);
            }
        }
    };

    // Handle file upload from DropZone
    const handleFileLoaded = useCallback((data: string[][]) => {
        if (data.length < 2) return;

        setFileData(data);
        const headers = data[0].map(h => h?.toString().trim() || `Columna ${data[0].indexOf(h) + 1}`);
        setColumns(headers);

        // Convert to row objects
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < data.length; i++) {
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
                row[header] = data[i][idx]?.toString().trim() || "";
            });
            rows.push(row);
        }
        setParsedRows(rows);

        // Auto-map common column names
        const autoMapping: ColumnMapping = { name: "", price: "" };
        headers.forEach(h => {
            const lower = h.toLowerCase();
            if (lower.includes("nombre") || lower.includes("name") || lower === "item" || lower === "producto") {
                autoMapping.name = h;
            }
            if (lower.includes("precio") || lower.includes("price") || lower === "valor") {
                autoMapping.price = h;
            }
            if (lower.includes("descripción") || lower.includes("descripcion") || lower.includes("description")) {
                autoMapping.description = h;
            }
            if (lower.includes("variante") || lower.includes("variant") || lower.includes("opciones")) {
                autoMapping.variants = h;
            }
            if (lower.includes("código") || lower.includes("codigo") || lower.includes("code") || lower === "sku") {
                autoMapping.code = h;
            }
            if (lower.includes("categoría") || lower.includes("categoria") || lower.includes("category")) {
                autoMapping.category = h;
                setUseCategoryColumn(true);
            }
        });
        setMapping(autoMapping);

        setCurrentStep(2);
    }, []);

    // Apply mapping and parse items
    const applyMapping = useCallback(() => {
        if (!mapping.name || !mapping.price) return;

        const items = parseMenuData(parsedRows, mapping);
        setParsedItems(items);
        setCurrentStep(3);
    }, [parsedRows, mapping]);

    // Handle import
    const handleImport = async () => {
        if (parsedItems.length === 0) return;

        setImporting(true);

        const validItems = parsedItems.filter(item => item.errors.length === 0 && item.name);

        if (useCategoryColumn && mapping.category) {
            // Group items by category and create missing categories
            const categoryGroups = new Map<string, ParsedMenuItem[]>();

            for (const item of validItems) {
                const catName = item.categoryName || "Sin Categoría";
                if (!categoryGroups.has(catName)) {
                    categoryGroups.set(catName, []);
                }
                categoryGroups.get(catName)!.push(item);
            }

            let totalSuccess = 0;
            let totalErrors = 0;

            for (const [catName, items] of categoryGroups) {
                // Find or create category
                let categoryId = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())?.id;

                if (!categoryId && restaurantId) {
                    const { data: newCat } = await createMenuCategory(restaurantId, catName);
                    if (newCat) {
                        categoryId = newCat.id;
                        setCategories(prev => [...prev, newCat]);
                    }
                }

                if (categoryId) {
                    const itemsToInsert: MenuItemInsert[] = items.map(item => ({
                        category_id: categoryId!,
                        name: item.name,
                        description: item.description || undefined,
                        price: item.price,
                        variants: item.variants,
                        code: item.code
                    }));

                    const { data, error } = await bulkInsertMenuItems(itemsToInsert);
                    if (!error && data) {
                        totalSuccess += data.length;
                    } else {
                        totalErrors += items.length;
                    }
                } else {
                    totalErrors += items.length;
                }
            }

            setImportResult({ success: totalSuccess, errors: totalErrors });
        } else {
            // Use selected category for all items
            if (!selectedCategoryId) {
                setImporting(false);
                return;
            }

            const itemsToInsert: MenuItemInsert[] = validItems.map(item => ({
                category_id: selectedCategoryId,
                name: item.name,
                description: item.description || undefined,
                price: item.price,
                variants: item.variants,
                code: item.code
            }));

            const { data, error } = await bulkInsertMenuItems(itemsToInsert);

            if (error) {
                setImportResult({ success: 0, errors: parsedItems.length });
            } else {
                setImportResult({
                    success: data?.length || 0,
                    errors: parsedItems.length - validItems.length
                });
            }
        }

        setImporting(false);
        setCurrentStep(4);
    };

    // Create new category
    const handleCreateCategory = async () => {
        if (!restaurantId || !newCategoryName.trim()) return;
        setIsCreatingCategory(true);

        const { data, error } = await createMenuCategory(restaurantId, newCategoryName.trim());

        setIsCreatingCategory(false);

        if (data && !error) {
            setCategories(prev => [...prev, data]);
            setSelectedCategoryId(data.id);
            setNewCategoryName("");
        }
    };

    const errorCount = parsedItems.filter(item => item.errors.length > 0).length;
    const validCount = parsedItems.filter(item => item.errors.length === 0 && item.name).length;

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={FileSpreadsheet}
                title="Importar Menú"
                subtitle="Importa items desde Excel o CSV en 4 simples pasos"
            />

            <div className="flex-1 p-6 max-w-5xl mx-auto w-full overflow-auto">
                {/* Step Indicator */}
                <div className="flex items-center gap-2 mb-8">
                    {STEPS.map((step, idx) => (
                        <div key={step.id} className="flex items-center">
                            <button
                                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                                disabled={step.id > currentStep}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                                    currentStep === step.id
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : step.id < currentStep
                                            ? "bg-primary/10 text-primary border-primary/30 cursor-pointer hover:bg-primary/20"
                                            : "bg-muted text-muted-foreground border-border"
                                )}
                            >
                                <step.icon size={16} />
                                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                            </button>
                            {idx < STEPS.length - 1 && (
                                <ArrowRight size={16} className="text-muted-foreground mx-2" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="bg-card border rounded-xl p-6 overflow-auto">
                    {/* Step 1: Upload File */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold">Paso 1: Subir Archivo</h2>
                            <p className="text-sm text-muted-foreground">
                                Arrastra tu archivo Excel o CSV, o haz clic para seleccionarlo. La primera fila debe ser el encabezado.
                            </p>

                            <DropZone
                                onFileLoaded={handleFileLoaded}
                                className="min-h-[250px]"
                            />

                            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                                <p className="font-medium">Columnas recomendadas:</p>
                                <p>• <strong>Nombre</strong> (requerido): Nombre del item</p>
                                <p>• <strong>Precio</strong> (requerido): Precio del item</p>
                                <p>• <strong>Descripción</strong>: Descripción o ingredientes</p>
                                <p>• <strong>Código</strong>: Código interno del restaurante</p>
                                <p>• <strong>Categoría</strong>: Categoría del item (crea automáticamente si no existe)</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Map Columns */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Paso 2: Mapear Columnas</h2>
                            <p className="text-sm text-muted-foreground">
                                Indica qué columna corresponde a cada campo.
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                                    <select
                                        value={mapping.name}
                                        onChange={(e) => setMapping(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Seleccionar columna...</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Precio *</label>
                                    <select
                                        value={mapping.price}
                                        onChange={(e) => setMapping(prev => ({ ...prev, price: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Seleccionar columna...</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Descripción</label>
                                    <select
                                        value={mapping.description || ""}
                                        onChange={(e) => setMapping(prev => ({ ...prev, description: e.target.value || undefined }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Sin descripción</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Código</label>
                                    <select
                                        value={mapping.code || ""}
                                        onChange={(e) => setMapping(prev => ({ ...prev, code: e.target.value || undefined }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Sin código</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Categoría</label>
                                    <select
                                        value={mapping.category || ""}
                                        onChange={(e) => {
                                            const val = e.target.value || undefined;
                                            setMapping(prev => ({ ...prev, category: val }));
                                            setUseCategoryColumn(!!val);
                                        }}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Usar categoría manual</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Variantes</label>
                                    <select
                                        value={mapping.variants || ""}
                                        onChange={(e) => setMapping(prev => ({ ...prev, variants: e.target.value || undefined }))}
                                        className="w-full px-3 py-2 border rounded-lg bg-background"
                                    >
                                        <option value="">Sin variantes</option>
                                        {columns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Preview table */}
                            <div className="border rounded-lg overflow-auto max-h-64">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            {columns.map(col => (
                                                <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.slice(0, 5).map((row, idx) => (
                                            <tr key={idx} className="border-t">
                                                {columns.map(col => (
                                                    <td key={col} className="px-3 py-2 truncate max-w-48">{row[col]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedRows.length > 5 && (
                                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                                        ... y {parsedRows.length - 5} filas más
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="flex items-center gap-2 px-4 py-2 border rounded-lg font-medium"
                                >
                                    <ArrowLeft size={16} />
                                    Anterior
                                </button>
                                <button
                                    onClick={applyMapping}
                                    disabled={!mapping.name || !mapping.price}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                                >
                                    Siguiente
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review Items */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Paso 3: Revisar Items</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {validCount} items válidos, {errorCount} con errores
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                        {validCount} válidos
                                    </span>
                                    {errorCount > 0 && (
                                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                            {errorCount} errores
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Items Preview */}
                            <div className="border rounded-lg overflow-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium w-8">#</th>
                                            {mapping.code && <th className="px-3 py-2 text-left font-medium">Código</th>}
                                            <th className="px-3 py-2 text-left font-medium">Nombre</th>
                                            <th className="px-3 py-2 text-left font-medium">Descripción</th>
                                            <th className="px-3 py-2 text-right font-medium">Precio</th>
                                            {useCategoryColumn && <th className="px-3 py-2 text-left font-medium">Categoría</th>}
                                            <th className="px-3 py-2 text-left font-medium">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedItems.map((item, idx) => (
                                            <tr key={idx} className={cn("border-t", item.errors.length > 0 && "bg-red-50")}>
                                                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                                {mapping.code && <td className="px-3 py-2 font-mono text-xs">{item.code || "-"}</td>}
                                                <td className="px-3 py-2 font-medium">{item.name || "-"}</td>
                                                <td className="px-3 py-2 truncate max-w-48 text-muted-foreground">
                                                    {item.description || "-"}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    ${item.price.toLocaleString("es-CL")}
                                                </td>
                                                {useCategoryColumn && (
                                                    <td className="px-3 py-2 text-xs">{item.categoryName || "-"}</td>
                                                )}
                                                <td className="px-3 py-2">
                                                    {item.errors.length > 0 ? (
                                                        <span className="text-red-600 text-xs">{item.errors.join(", ")}</span>
                                                    ) : (
                                                        <CheckCircle2 size={16} className="text-green-600" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Category Selection - only show if not using category column */}
                            {!useCategoryColumn && (
                                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                                    <label className="block text-sm font-medium">Categoría destino</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedCategoryId}
                                            onChange={(e) => setSelectedCategoryId(e.target.value)}
                                            className="flex-1 px-3 py-2 border rounded-lg bg-background"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="Nueva categoría..."
                                                className="px-3 py-2 border rounded-lg w-40 bg-background"
                                            />
                                            <button
                                                onClick={handleCreateCategory}
                                                disabled={!newCategoryName.trim() || isCreatingCategory}
                                                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                                            >
                                                {isCreatingCategory ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {useCategoryColumn && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                                    <strong>Importación por categoría:</strong> Los items se asignarán automáticamente a las categorías indicadas en la columna "{mapping.category}". Si una categoría no existe, se creará automáticamente.
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="flex items-center gap-2 px-4 py-2 border rounded-lg font-medium"
                                >
                                    <ArrowLeft size={16} />
                                    Anterior
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || (!useCategoryColumn && !selectedCategoryId) || importing}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Importando...
                                        </>
                                    ) : (
                                        <>
                                            Importar {validCount} items
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirm */}
                    {currentStep === 4 && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            {importResult?.success ? (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={32} className="text-green-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-green-600">¡Importación Exitosa!</h2>
                                    <p className="text-muted-foreground">
                                        Se importaron {importResult.success} items correctamente.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                        <AlertCircle size={32} className="text-red-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-red-600">Error en Importación</h2>
                                    <p className="text-muted-foreground">
                                        No se pudieron importar los items.
                                    </p>
                                </>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setCurrentStep(1);
                                        setFileData(null);
                                        setParsedRows([]);
                                        setParsedItems([]);
                                        setImportResult(null);
                                    }}
                                    className="px-4 py-2 border rounded-lg font-medium"
                                >
                                    Importar más
                                </button>
                                <a
                                    href="/dashboard/menu"
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                                >
                                    Ver Menú
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
