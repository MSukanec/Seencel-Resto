"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, FloorObject, FloorObjectType } from "@/features/floor-plan/core/Canvas";
import { FloorProvider, useFloor } from "@/features/floor-plan/core/floor-context";
import { FloorSelector } from "@/features/floor-plan/core/FloorSelector";
import { TablePropertiesForm } from "@/features/floor-plan/core/TablePropertiesForm";
import { BarPropertiesForm } from "@/features/floor-plan/core/BarPropertiesForm";
import { LayoutManager } from "@/features/floor-plan/core/LayoutManager";
import { TemplateSelector } from "@/features/floor-plan/core/TemplateSelector";
import { getFloorObjects } from "@/lib/supabase/floor-object-queries";
import { getTemplates, getTemplateItems, replaceTemplateItems, deleteTemplate, LayoutTemplate } from "@/lib/supabase/template-queries";
import { Loader2, Save, Trash2, CheckCircle2, Utensils, Beer, MousePointer2, Pencil, Layout, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RightDrawer } from "@/components/ui/right-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/ui/confirm-modal";

// --- Tools ---
const TABLE_TOOLS: { id: FloorObjectType | "select"; label: string; icon: React.ElementType }[] = [
    { id: "select", label: "Seleccionar", icon: MousePointer2 },
    { id: "table", label: "Mesa", icon: Utensils },
    { id: "bar", label: "Barra", icon: Beer },
];

interface FloorTablesCanvasProps {
    restaurantId: string;
}

function FloorTablesCanvasInner({ restaurantId }: FloorTablesCanvasProps) {
    const { selectedFloorId, selectedFloor, isLoading: floorsLoading } = useFloor();
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
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
    const [startLayoutCreating, setStartLayoutCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<LayoutTemplate | null>(null);

    // Mobile toolbar popover
    const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
    const mobileToolsRef = useRef<HTMLDivElement>(null);

    // Merge mode state - for selecting tables on canvas
    const [mergeMode, setMergeMode] = useState(false);
    const [tablesToMerge, setTablesToMerge] = useState<Set<string>>(new Set());

    // Confirm hook
    const confirm = useConfirm();

    const updateObjects = (newObjects: React.SetStateAction<FloorObject[]>) => {
        setObjects(newObjects);
        setHasChanges(true);
    };

    useEffect(() => {
        if (selectedFloorId) {
            loadArchitecture();
        }
        if (restaurantId) {
            loadSettings();
            checkTemplates();
        }
    }, [selectedFloorId, restaurantId]);

    useEffect(() => {
        if (selectedFloorId && activeTemplateId) {
            loadTables();
        }
    }, [activeTemplateId, selectedFloorId]);

    // Close mobile tools on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mobileToolsRef.current && !mobileToolsRef.current.contains(e.target as Node)) {
                setMobileToolsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadSettings = async () => {
        const { getRestaurantSettings } = await import("@/lib/supabase/settings-queries");
        const { data } = await getRestaurantSettings(restaurantId);
        if (data) {
            if (data.chair_spacing_cm) setChairSpacingCm(data.chair_spacing_cm);
            if (data.default_table_size_cm) setDefaultTableSizeCm(data.default_table_size_cm);
        }
    };

    const checkTemplates = async () => {
        const { data } = await getTemplates(restaurantId);
        if (data) {
            setTemplates(data);
            if (data.length > 0 && !activeTemplateId) {
                setActiveTemplateId(data[0].id);
            }
        }
        setLoading(false);
    };

    const loadTables = async () => {
        if (!selectedFloorId || !activeTemplateId) return;
        setLoading(true);

        const { data } = await getTemplateItems(activeTemplateId, selectedFloorId);
        if (data) {
            const canvasObjects: FloorObject[] = data.map(item => ({
                id: item.id,
                type: 'table' as const,
                x: Number(item.x),
                y: Number(item.y),
                width: Number(item.width),
                height: Number(item.height),
                rotation: Number(item.angle),
                label: item.label,
                shape: item.shape as any,
                seats: item.seats,
                seating: (item.seating || {
                    top: { enabled: true, type: "chair" },
                    right: { enabled: true, type: "chair" },
                    bottom: { enabled: true, type: "chair" },
                    left: { enabled: true, type: "chair" },
                }) as FloorObject['seating'],
                mergedGroup: item.merged_group || undefined,
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
            const arch = data
                .filter(o => ['wall', 'window', 'door', 'pillar'].includes(o.type))
                .map(o => ({
                    id: o.id,
                    type: o.type === 'pillar' ? 'column' : o.type as FloorObjectType,
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
        if (!selectedFloorId || !activeTemplateId) return;
        setSaving(true);

        const itemsToSave = objects.map(o => ({
            label: o.label || "Mesa",
            x: Math.round(o.x),
            y: Math.round(o.y),
            width: Math.round(o.width),
            height: Math.round(o.height),
            shape: (() => {
                const s = (o.shape || "rectangular").toLowerCase();
                if (s.includes("rect")) return "rectangle";
                if (s.includes("circ") || s.includes("round")) return "circle";
                if (s.includes("square")) return "square";
                return "rectangle";
            })() as "rectangle" | "circle" | "square",
            seats: o.seats || 4,
            angle: Math.round(o.rotation),
            seating: o.seating,
            merged_group: o.mergedGroup || undefined
        }));

        const { error } = await replaceTemplateItems(activeTemplateId, selectedFloorId, itemsToSave);
        if (!error) setHasChanges(false);
        setSaving(false);
    };

    const handleDeleteTemplate = async () => {
        if (!activeTemplateId) return;
        const activeTemplate = templates.find(t => t.id === activeTemplateId);
        const confirmed = await confirm({
            title: "Eliminar Plantilla",
            message: `¿Estás seguro de que deseas eliminar la plantilla "${activeTemplate?.name || 'seleccionada'}"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger"
        });
        if (!confirmed) return;

        const { error } = await deleteTemplate(activeTemplateId);
        if (error) {
            console.error("Error deleting template:", error);
            return;
        }
        // Refresh templates
        const { data } = await getTemplates(restaurantId);
        if (data) {
            setTemplates(data);
            if (data.length > 0) {
                setActiveTemplateId(data[0].id);
            } else {
                setActiveTemplateId(null);
            }
        }
    };

    const handleDelete = () => {
        if (selectedIds.size > 0) {
            updateObjects(prev => prev.filter(o => !selectedIds.has(o.id)));
            setSelectedIds(new Set());
            setSelectedId(null);
        } else if (selectedId) {
            updateObjects(prev => prev.filter(o => o.id !== selectedId));
            setSelectedId(null);
        }
    };

    // Merge tables together - smart positioning based on relative position
    const handleMergeTables = (tableIds: string[]) => {
        if (tableIds.length < 2) return;

        // Generate unique group ID
        const groupId = crypto.randomUUID();

        // First table in the array is the SELECTED table (stays fixed)
        // Second table is the one being joined (moves)
        const selectedTable = objects.find(o => o.id === tableIds[0]);
        const joiningTable = objects.find(o => o.id === tableIds[1]);

        if (!selectedTable || !joiningTable) return;

        // Calculate relative position of joining table to selected table
        const dx = (joiningTable.x + joiningTable.width / 2) - (selectedTable.x + selectedTable.width / 2);
        const dy = (joiningTable.y + joiningTable.height / 2) - (selectedTable.y + selectedTable.height / 2);

        // Determine which side the joining table should attach to
        let side: 'left' | 'right' | 'top' | 'bottom';
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal dominant
            side = dx < 0 ? 'left' : 'right';
        } else {
            // Vertical dominant
            side = dy < 0 ? 'top' : 'bottom';
        }

        // Calculate new position for joining table based on side
        let newX = joiningTable.x;
        let newY = joiningTable.y;

        switch (side) {
            case 'right':
                newX = selectedTable.x + selectedTable.width;
                newY = selectedTable.y;
                break;
            case 'left':
                newX = selectedTable.x - joiningTable.width;
                newY = selectedTable.y;
                break;
            case 'bottom':
                newX = selectedTable.x;
                newY = selectedTable.y + selectedTable.height;
                break;
            case 'top':
                newX = selectedTable.x;
                newY = selectedTable.y - joiningTable.height;
                break;
        }

        // Combined label (selected first)
        const combinedLabel = `${selectedTable.label || selectedTable.id.slice(0, 4)}+${joiningTable.label || joiningTable.id.slice(0, 4)}`;

        updateObjects(prev => prev.map(obj => {
            if (obj.id === selectedTable.id) {
                // Selected table - stays in place, just update group and seating
                const disabledSide = side === 'right' ? 'right' : side === 'left' ? 'left' : side === 'bottom' ? 'bottom' : 'top';
                // Deep clone seating to preserve original state
                const newSeating = obj.seating ? {
                    top: obj.seating.top ? { ...obj.seating.top } : undefined,
                    right: obj.seating.right ? { ...obj.seating.right } : undefined,
                    bottom: obj.seating.bottom ? { ...obj.seating.bottom } : undefined,
                    left: obj.seating.left ? { ...obj.seating.left } : undefined,
                } : {};
                // Only disable the internal side
                if (newSeating[disabledSide]) {
                    newSeating[disabledSide] = { ...newSeating[disabledSide]!, enabled: false };
                }
                return {
                    ...obj,
                    mergedGroup: groupId,
                    label: combinedLabel,
                    seating: newSeating
                };
            }
            if (obj.id === joiningTable.id) {
                // Joining table - moves to position
                const disabledSide = side === 'right' ? 'left' : side === 'left' ? 'right' : side === 'bottom' ? 'top' : 'bottom';
                // Deep clone seating to preserve original state
                const newSeating = obj.seating ? {
                    top: obj.seating.top ? { ...obj.seating.top } : undefined,
                    right: obj.seating.right ? { ...obj.seating.right } : undefined,
                    bottom: obj.seating.bottom ? { ...obj.seating.bottom } : undefined,
                    left: obj.seating.left ? { ...obj.seating.left } : undefined,
                } : {};
                // Only disable the internal side
                if (newSeating[disabledSide]) {
                    newSeating[disabledSide] = { ...newSeating[disabledSide]!, enabled: false };
                }
                return {
                    ...obj,
                    mergedGroup: groupId,
                    x: newX,
                    y: newY,
                    rotation: selectedTable.rotation,
                    seating: newSeating
                };
            }
            return obj;
        }));

        setHasChanges(true);
    };

    // Unmerge tables
    const handleUnmergeTables = (groupId: string) => {
        // Get combined label from the merged group to extract individual labels
        const mergedTables = objects.filter(o => o.mergedGroup === groupId);
        const combinedLabel = mergedTables.find(t => t.label?.includes('+'))?.label;
        const originalLabels = combinedLabel?.split('+') || [];

        updateObjects(prev => prev.map(obj => {
            if (obj.mergedGroup !== groupId) return obj;

            // Deep clone seating and re-enable all sides
            const newSeating = obj.seating ? {
                top: obj.seating.top ? { ...obj.seating.top, enabled: true } : undefined,
                right: obj.seating.right ? { ...obj.seating.right, enabled: true } : undefined,
                bottom: obj.seating.bottom ? { ...obj.seating.bottom, enabled: true } : undefined,
                left: obj.seating.left ? { ...obj.seating.left, enabled: true } : undefined,
            } : {};

            // Try to restore original label - find which one matches
            const tableIndex = mergedTables.findIndex(t => t.id === obj.id);
            const restoredLabel = originalLabels[tableIndex] || obj.label?.split('+')[0] || obj.label;

            return {
                ...obj,
                mergedGroup: undefined,
                label: restoredLabel,
                seating: newSeating
            };
        }));

        setHasChanges(true);
    };

    // Start merge mode - current table is first in merge set
    const handleStartMergeMode = () => {
        if (selectedId) {
            setMergeMode(true);
            setTablesToMerge(new Set([selectedId]));
        }
    };

    // Cancel merge mode
    const handleCancelMergeMode = () => {
        setMergeMode(false);
        setTablesToMerge(new Set());
    };

    // Handle table selection - if in merge mode, add to merge set and execute merge
    const handleTableSelect = (tableId: string | null) => {
        if (mergeMode && tableId) {
            const table = objects.find(o => o.id === tableId);
            // Only allow merge with tables not already in a group
            if (table && !table.mergedGroup && table.type === 'table' && !tablesToMerge.has(tableId)) {
                const newSet = new Set(tablesToMerge);
                newSet.add(tableId);

                // Execute merge immediately
                handleMergeTables(Array.from(newSet));

                // Exit merge mode
                setMergeMode(false);
                setTablesToMerge(new Set());
            }
        } else {
            setSelectedId(tableId);
        }
    };

    const handleMobileToolSelect = (toolId: FloorObjectType | "select") => {
        setSelectedTool(toolId);
        setMobileToolsOpen(false);
    };

    const selectedObject = objects.find(o => o.id === selectedId);
    const totalSeats = objects.reduce((acc, obj) => {
        if (obj.type !== 'table' || !obj.seating) return acc;
        return acc +
            (obj.seating.top?.enabled ? 1 : 0) +
            (obj.seating.right?.enabled ? 1 : 0) +
            (obj.seating.bottom?.enabled ? 1 : 0) +
            (obj.seating.left?.enabled ? 1 : 0);
    }, 0);

    // Show loader while loading
    if (floorsLoading || loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    if (templates.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <PageHeader icon={Layout} title="Plantillas" subtitle="Diseña diferentes disposiciones" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <EmptyState
                        title="No hay plantillas creadas"
                        description="Crea tu primera plantilla para organizar las mesas de tu restaurante."
                        icon={Layout}
                        actionLabel="Crear Primera Plantilla"
                        onAction={() => {
                            setEditingTemplate(null);
                            setStartLayoutCreating(true);
                            setLayoutManagerOpen(true);
                        }}
                    />
                </div>
                <LayoutManager
                    restaurantId={restaurantId}
                    onApply={() => { loadTables(); checkTemplates(); }}
                    isOpen={layoutManagerOpen}
                    onClose={() => setLayoutManagerOpen(false)}
                    startCreating={startLayoutCreating}
                    editingTemplate={editingTemplate}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header - Responsive */}
            <PageHeader
                icon={Layout}
                title="Plantillas"
                subtitle={`${totalSeats} cubiertos`}
                actions={
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        {/* Template selector - hidden on very small screens */}
                        <div className="hidden sm:block">
                            <TemplateSelector
                                templates={templates}
                                selectedTemplateId={activeTemplateId}
                                onSelect={setActiveTemplateId}
                                onCreate={() => {
                                    setEditingTemplate(null);
                                    setStartLayoutCreating(true);
                                    setLayoutManagerOpen(true);
                                }}
                            />
                        </div>

                        {/* Mobile template selector */}
                        <div className="sm:hidden">
                            <TemplateSelector
                                templates={templates}
                                selectedTemplateId={activeTemplateId}
                                onSelect={setActiveTemplateId}
                                onCreate={() => {
                                    setEditingTemplate(null);
                                    setStartLayoutCreating(true);
                                    setLayoutManagerOpen(true);
                                }}
                            />
                        </div>

                        {activeTemplateId && (
                            <>
                                <button
                                    onClick={() => {
                                        const t = templates.find(t => t.id === activeTemplateId);
                                        if (t) { setEditingTemplate(t); setLayoutManagerOpen(true); }
                                    }}
                                    className="p-2 rounded-lg text-muted-foreground hover:bg-accent"
                                    title="Renombrar"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={handleDeleteTemplate}
                                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}

                        <div className="hidden sm:block w-px h-6 bg-border" />
                        <div className="hidden sm:block">
                            <FloorSelector restaurantId={restaurantId} />
                        </div>

                        {(selectedId || selectedIds.size > 0) && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center justify-center h-8 w-8 sm:w-auto sm:px-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium",
                                hasChanges ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"
                            )}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : hasChanges ? <Save size={16} /> : <CheckCircle2 size={12} />}
                            <span className="hidden sm:inline">{saving ? "Guardando..." : hasChanges ? "Guardar" : "Guardado"}</span>
                        </button>
                    </div>
                }
            />

            <div className="flex-1 overflow-hidden relative">
                <Canvas
                    objects={objects}
                    setObjects={updateObjects}
                    selectedTool={selectedTool}
                    onToolUsed={() => { }}
                    onSelectTool={setSelectedTool}
                    selectedId={selectedId}
                    onSelectId={handleTableSelect}
                    selectedIds={selectedIds}
                    onMultiSelect={setSelectedIds}
                    backgroundObjects={architectureObjects}
                    chairSpacingCm={chairSpacingCm}
                    defaultTableSizeCm={defaultTableSizeCm}
                    mergeMode={mergeMode}
                    tablesToMerge={tablesToMerge}
                />

                {/* Desktop Floating Tools Dock */}
                <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-3 p-2 rounded-full bg-background/90 backdrop-blur border shadow-xl z-20">
                    {TABLE_TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full border font-medium text-sm",
                                selectedTool === tool.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background/50 hover:bg-accent text-muted-foreground border-transparent"
                            )}
                        >
                            <tool.icon size={20} />
                            <span>{tool.label}</span>
                        </button>
                    ))}
                </div>

                {/* Mobile Floating Tools Button */}
                <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-20" ref={mobileToolsRef}>
                    <button
                        onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-full bg-background/95 backdrop-blur border shadow-xl transition-all",
                            selectedTool && selectedTool !== "select" ? "border-primary" : "border-border"
                        )}
                    >
                        {selectedTool && selectedTool !== "select" ? (
                            <>
                                {(() => {
                                    const tool = TABLE_TOOLS.find(t => t.id === selectedTool);
                                    if (tool) return <tool.icon size={20} className="text-primary" />;
                                    return <Plus size={20} />;
                                })()}
                                <span className="font-medium text-sm">
                                    {TABLE_TOOLS.find(t => t.id === selectedTool)?.label}
                                </span>
                            </>
                        ) : (
                            <>
                                <Plus size={20} className="text-primary" />
                                <span className="font-medium text-sm">Herramientas</span>
                            </>
                        )}
                    </button>

                    {/* Mobile Tools Popover */}
                    {mobileToolsOpen && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 min-w-[180px]">
                            {TABLE_TOOLS.map((tool, index) => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleMobileToolSelect(tool.id)}
                                    className={cn(
                                        "flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                        selectedTool === tool.id
                                            ? "bg-primary/10 text-primary"
                                            : "text-foreground hover:bg-accent",
                                        index !== 0 && "border-t border-border/50"
                                    )}
                                >
                                    <tool.icon size={18} />
                                    {tool.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <RightDrawer
                isOpen={!!selectedObject && (selectedObject.type === 'table' || selectedObject.type === 'bar')}
                onClose={() => setSelectedId(null)}
                titlePrefix={selectedObject?.type === 'table' ? "Mesa " : selectedObject?.type === 'bar' ? "Barra " : ""}
                title={selectedObject?.label || ''}
                onTitleChange={(newLabel) => {
                    if (selectedId) {
                        updateObjects(prev => prev.map(o => o.id === selectedId ? { ...o, label: newLabel } : o));
                    }
                }}
            >
                {selectedObject?.type === 'table' && (
                    <TablePropertiesForm
                        object={selectedObject}
                        label={selectedObject.label}
                        onChange={(updates) => {
                            const ids = selectedIds.size > 0 ? selectedIds : new Set([selectedId]);

                            // Special handling for rotation of merged tables
                            if (updates.rotation !== undefined && selectedObject.mergedGroup) {
                                const groupTables = objects.filter(o => o.mergedGroup === selectedObject.mergedGroup);
                                if (groupTables.length > 1) {
                                    // Calculate group center
                                    const minX = Math.min(...groupTables.map(t => t.x));
                                    const maxX = Math.max(...groupTables.map(t => t.x + t.width));
                                    const minY = Math.min(...groupTables.map(t => t.y));
                                    const maxY = Math.max(...groupTables.map(t => t.y + t.height));
                                    const groupCenterX = (minX + maxX) / 2;
                                    const groupCenterY = (minY + maxY) / 2;

                                    // Calculate rotation delta
                                    const currentRotation = selectedObject.rotation || 0;
                                    const newRotation = updates.rotation;
                                    const rotationDelta = (newRotation - currentRotation) * (Math.PI / 180);

                                    updateObjects(prev => prev.map(o => {
                                        if (o.mergedGroup !== selectedObject.mergedGroup) return o;

                                        // Rotate each table's position around group center
                                        const tableCenterX = o.x + o.width / 2;
                                        const tableCenterY = o.y + o.height / 2;

                                        const dx = tableCenterX - groupCenterX;
                                        const dy = tableCenterY - groupCenterY;

                                        const newCenterX = groupCenterX + dx * Math.cos(rotationDelta) - dy * Math.sin(rotationDelta);
                                        const newCenterY = groupCenterY + dx * Math.sin(rotationDelta) + dy * Math.cos(rotationDelta);

                                        return {
                                            ...o,
                                            x: newCenterX - o.width / 2,
                                            y: newCenterY - o.height / 2,
                                            rotation: newRotation
                                        };
                                    }));
                                    return;
                                }
                            }

                            // Normal update for non-merged or non-rotation changes
                            updateObjects(prev => prev.map(o => ids.has(o.id) ? { ...o, ...updates } : o));
                        }}
                        allTables={objects.filter(o => o.type === 'table')}
                        isMergeMode={mergeMode}
                        onStartMergeMode={handleStartMergeMode}
                        onCancelMergeMode={handleCancelMergeMode}
                        onUnmergeTables={handleUnmergeTables}
                    />
                )}
                {selectedObject?.type === 'bar' && (
                    <BarPropertiesForm
                        object={selectedObject}
                        onChange={(updates) => {
                            const ids = selectedIds.size > 0 ? selectedIds : new Set([selectedId]);
                            updateObjects(prev => prev.map(o => ids.has(o.id) ? { ...o, ...updates } : o));
                        }}
                    />
                )}
            </RightDrawer>

            <LayoutManager
                restaurantId={restaurantId}
                onApply={(newTemplateId) => {
                    loadTables();
                    checkTemplates();
                    // Auto-select the newly created template
                    if (newTemplateId) {
                        setActiveTemplateId(newTemplateId);
                    }
                }}
                isOpen={layoutManagerOpen}
                onClose={() => { setLayoutManagerOpen(false); setEditingTemplate(null); }}
                startCreating={startLayoutCreating}
                editingTemplate={editingTemplate}
            />
        </div>
    );
}

export function FloorTablesCanvas({ restaurantId }: FloorTablesCanvasProps) {
    if (!restaurantId) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
    }

    return (
        <FloorProvider restaurantId={restaurantId}>
            <FloorTablesCanvasInner restaurantId={restaurantId} />
        </FloorProvider>
    );
}
