"use client";

import { useState, useEffect } from "react";
import { Canvas, FloorObject, FloorObjectType } from "@/components/floor-plan/Canvas";
import { cn } from "@/lib/utils";
import { MousePointer2, Loader2, Save, Trash2, Utensils, Beer, CheckCircle2, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { RightDrawer } from "@/components/ui/right-drawer";
import { TablePropertiesForm } from "@/components/floor-plan/TablePropertiesForm";
import { BarPropertiesForm } from "@/components/floor-plan/BarPropertiesForm";
import { LayoutManager } from "@/components/floor-plan/LayoutManager";
import { FloorSelector } from "@/components/floor-plan/FloorSelector";
import { useFloor } from "@/contexts/FloorContext";
import { getTables, bulkSaveTables, generateTableLabel } from "@/lib/supabase/table-queries";
import { getFloorObjects } from "@/lib/supabase/floor-object-queries";
import { createClient } from "@/lib/supabase/client";

import { getTemplates, LayoutTemplate, applyTemplate } from "@/lib/supabase/template-queries";
import { FolderOpen, Layout } from "lucide-react";
import { TemplateSelector } from "@/components/floor-plan/TemplateSelector";

export default function TablesPage() {
    const { selectedFloorId } = useFloor();
    const [objects, setObjects] = useState<FloorObject[]>([]);
    const [architectureObjects, setArchitectureObjects] = useState<FloorObject[]>([]);
    const [selectedTool, setSelectedTool] = useState<FloorObjectType | "select" | null>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chairSpacingCm, setChairSpacingCm] = useState(60);
    const [defaultTableSizeCm, setDefaultTableSizeCm] = useState(70);

    // Template State
    const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
    const [hasTemplates, setHasTemplates] = useState<boolean | null>(null); // null = loading/unknown
    const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
    const [startLayoutCreating, setStartLayoutCreating] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<LayoutTemplate | null>(null);

    // Wrapper to track changes
    const updateObjects = (newObjects: React.SetStateAction<FloorObject[]>) => {
        setObjects(newObjects);
        setHasChanges(true);
    };

    const getRestaurantId = () => {
        if (typeof document !== 'undefined') {
            const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
            return match ? match[2] : null;
        }
        return null;
    };

    const restaurantId = getRestaurantId();

    // Load tables and architecture when floor changes
    useEffect(() => {
        if (selectedFloorId) {
            loadTables();
            loadArchitecture();
        } else {
            setLoading(false);
        }
        if (restaurantId) {
            loadSettings();
            checkTemplates();
        }
    }, [selectedFloorId, restaurantId]);

    const loadSettings = async () => {
        if (!restaurantId) return;
        const { getRestaurantSettings } = await import("@/lib/supabase/settings-queries");
        const { data } = await getRestaurantSettings(restaurantId);
        if (data) {
            if (data.chair_spacing_cm) setChairSpacingCm(data.chair_spacing_cm);
            if (data.default_table_size_cm) setDefaultTableSizeCm(data.default_table_size_cm);
        }
    };

    const checkTemplates = async () => {
        if (!restaurantId) return;
        const { data } = await getTemplates(restaurantId);
        if (data) {
            setTemplates(data);
            setHasTemplates(data.length > 0);

            // If there are templates and none selected, select the first one by default
            if (data.length > 0 && !activeTemplateId) {
                setActiveTemplateId(data[0].id);
            }
            // If active template was deleted, reset or select first
            else if (activeTemplateId && !data.find(t => t.id === activeTemplateId)) {
                setActiveTemplateId(data.length > 0 ? data[0].id : null);
            }
        } else {
            setTemplates([]);
            setHasTemplates(false);
            setActiveTemplateId(null);
        }
    };


    // ... (logic for handleApplyTemplate)

    const handleDeleteTemplate = async () => {
        if (!activeTemplateId || !restaurantId) return;
        if (!confirm("¿Estás seguro de que deseas eliminar esta plantilla?")) return;

        const { deleteTemplate } = await import("@/lib/supabase/template-queries");
        const { error } = await deleteTemplate(activeTemplateId);

        if (!error) {
            checkTemplates();
        } else {
            alert("Error al eliminar la plantilla");
        }
    };

    const loadTables = async () => {
        if (!selectedFloorId) return;
        setLoading(true);
        const { data, error } = await getTables(selectedFloorId);
        if (data) {
            // Map DB TableRecord to Canvas FloorObject
            const canvasObjects: FloorObject[] = data.map(t => ({
                id: t.id,
                type: t.label.toLowerCase().includes('barra') ? 'bar' : 'table', // Heuristic for type
                x: t.x,
                y: t.y,
                width: t.width,
                height: t.height,
                rotation: t.angle, // Map angle -> rotation
                label: t.label,
                shape: t.shape as any,
                seats: t.seats,
                // Default seating enabled for all sides to ensure they are visible
                seating: {
                    top: { enabled: true, type: "chair" },
                    right: { enabled: true, type: "chair" },
                    bottom: { enabled: true, type: "chair" },
                    left: { enabled: true, type: "chair" },
                }
            }));
            setObjects(canvasObjects);
            setHasChanges(false);
        }
        setLoading(false);
    };

    const loadArchitecture = async () => {
        if (!selectedFloorId) return;
        const { data } = await getFloorObjects(selectedFloorId);
        if (data) {
            // Filter and map architectural elements
            const arch = data
                .filter(o => ['wall', 'window', 'door', 'pillar'].includes(o.type))
                .map(o => ({
                    id: o.id,
                    type: o.type === 'pillar' ? 'column' : o.type as FloorObjectType, // Map pillar -> column
                    x: o.x,
                    y: o.y,
                    width: o.width,
                    height: o.height,
                    rotation: o.angle,
                    alignment: o.properties?.alignment,
                    attachedWallId: o.properties?.attachedWallId,
                    doorType: o.properties?.doorType,
                    swingDirection: o.properties?.swingDirection,
                    shape: o.properties?.shape,
                }));
            setArchitectureObjects(arch);
        }
    };

    const handleSave = async () => {
        if (!selectedFloorId || !restaurantId) return;
        setSaving(true);

        // Map Canvas Objects -> DB Table inserts
        // We only save Tables and Bars to the 'tables' table for now
        // Architecture is typically saved in architecture editor, but if we allow moving them here, we should check.
        // For now, TablesPage mostly edits tables/bars.

        const tablesToSave = objects.map(o => {
            // Map Canvas shape "rectangular" -> DB "rectangle", "circular" -> "circle"
            let shape: "square" | "rectangle" | "circle" = "rectangle";
            if (o.shape === "rectangular") shape = "rectangle";
            else if (o.shape === "circular") shape = "circle";
            else if (o.shape === "square") shape = "square";

            return {
                label: o.label || "Mesa",
                x: o.x,
                y: o.y,
                width: o.width,
                height: o.height,
                shape: shape,
                seats: 4, // Default or calculate from seating?
                angle: o.rotation
            };
        });

        const { error } = await bulkSaveTables(selectedFloorId, tablesToSave);
        if (!error) {
            setHasChanges(false);
        } else {
            alert("Error al guardar");
        }
        setSaving(false);
    };

    const selectedObject = objects.find(o => o.id === selectedId) || null;
    const handleApplyTemplate = async (templateId: string) => {
        if (!confirm("¿Deseas aplicar esta plantilla? Se reemplazará la distribución actual del piso.")) return;
        // We might need to import applyTemplate here if not imported, assumed imported from template-queries or we add it to imports
        const { applyTemplate } = await import("@/lib/supabase/template-queries"); // Lazy import or add up top

        setLoading(true);
        const { error } = await applyTemplate(templateId);
        if (!error) {
            await loadTables();
            setActiveTemplateId(templateId);
        } else {
            alert("Error al aplicar plantilla");
        }
        setLoading(false);
    };

    // Tool definitions
    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Seleccionar' },
        { id: 'table', icon: Utensils, label: 'Mesa' },
        { id: 'bar', icon: Beer, label: 'Barra' },
    ] as const;

    return (
        <div className="flex flex-col h-full w-full bg-muted/30">
            {/* Header */}
            <div className="flex h-16 items-center justify-between px-4 border-b bg-background/50 backdrop-blur-sm z-10 relative">


                {/* Left Side: Selectors */}
                <div className="flex items-center gap-2">
                    {/* Template Selector with Edit Actions */}
                    {restaurantId && (
                        <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                            <TemplateSelector
                                templates={templates}
                                selectedTemplateId={activeTemplateId}
                                onSelect={handleApplyTemplate}
                                onCreate={() => {
                                    setEditingTemplate(null);
                                    setStartLayoutCreating(true);
                                    setLayoutManagerOpen(true);
                                }}
                            />

                            {/* Template Actions - Only show if template selected */}
                            {activeTemplateId && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            const tmpl = templates.find(t => t.id === activeTemplateId);
                                            if (tmpl) {
                                                setEditingTemplate(tmpl);
                                                setStartLayoutCreating(false);
                                                setLayoutManagerOpen(true);
                                            }
                                        }}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                        title="Renombrar plantilla actual"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={handleDeleteTemplate}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        title="Eliminar plantilla actual"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Floor Selector */}
                    {restaurantId && <FloorSelector restaurantId={restaurantId} />}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2">
                    {(selectedId || selectedIds.size > 0) && (
                        <button
                            onClick={() => {
                                if (selectedIds.size > 0) {
                                    updateObjects(prev => prev.filter(o => !selectedIds.has(o.id)));
                                    setSelectedIds(new Set());
                                    setSelectedId(null);
                                } else if (selectedId) {
                                    updateObjects(prev => prev.filter(o => o.id !== selectedId));
                                    setSelectedId(null);
                                }
                            }}
                            className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                            title="Eliminar elemento seleccionado (Supr)"
                        >
                            <Trash2 size={16} />
                            <span className="hidden sm:inline">Eliminar</span>
                        </button>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors shadow-sm",
                            hasChanges
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-3px_var(--primary)]"
                                : "bg-muted text-muted-foreground border border-border"
                        )}
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : hasChanges ? <Save size={16} /> : <div className="w-4 h-4 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center"><CheckCircle2 size={12} /></div>}
                        {saving ? "Guardando..." : hasChanges ? "Guardar" : "Guardado"}
                    </button>
                </div>
            </div>

            {/* Modals */}
            {restaurantId && <LayoutManager
                restaurantId={restaurantId}
                onApply={() => {
                    loadTables();
                    checkTemplates();
                }}
                isOpen={layoutManagerOpen}
                onClose={() => {
                    setLayoutManagerOpen(false);
                    setEditingTemplate(null);
                }}
                startCreating={startLayoutCreating}
                editingTemplate={editingTemplate}
            />}

            {/* Canvas Container */}
            <div className="flex-1 overflow-hidden relative bg-transparent">
                <Canvas
                    key={selectedFloorId /* Force reset on floor switch */}
                    objects={objects}
                    setObjects={updateObjects}
                    selectedTool={selectedTool}
                    onToolUsed={() => { }}
                    onSelectTool={setSelectedTool}
                    selectedId={selectedId}
                    onSelectId={setSelectedId}
                    selectedIds={selectedIds}
                    onMultiSelect={setSelectedIds}
                    backgroundObjects={architectureObjects}
                    chairSpacingCm={chairSpacingCm}
                    defaultTableSizeCm={defaultTableSizeCm}
                />

                {/* Floating Tools Dock */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 rounded-full bg-background/90 backdrop-blur border shadow-xl z-20">
                    {tools.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 border font-medium text-sm",
                                selectedTool === tool.id
                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                    : "bg-background/50 hover:bg-accent text-muted-foreground border-transparent hover:border-border"
                            )}
                            title={tool.label}
                        >
                            <tool.icon size={20} />
                            <span>{tool.label}</span>
                        </button>
                    ))}
                </div>
            </div >

            {/* Drawer */}
            < RightDrawer
                isOpen={!!selectedObject && (selectedObject.type === 'table' || selectedObject.type === 'bar')
                }
                onClose={() => setSelectedId(null)}
                title={selectedObject?.type === 'table' ? "Propiedades de Mesa" : "Propiedades de Barra"}
            >
                {selectedObject?.type === 'table' && (
                    <TablePropertiesForm
                        object={selectedObject}
                        label={selectedObject.label}
                        onChange={(updates) => {
                            updateObjects(prev => prev.map(o =>
                                o.id === selectedId ? { ...o, ...updates } : o
                            ));
                        }}
                    />
                )}
                {
                    selectedObject?.type === 'bar' && (
                        <BarPropertiesForm
                            object={selectedObject}
                            onChange={(updates) => {
                                updateObjects(prev => prev.map(o =>
                                    o.id === selectedId ? { ...o, ...updates } : o
                                ));
                            }}
                        />
                    )
                }
            </RightDrawer >
        </div >
    );
}
