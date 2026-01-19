"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, FloorObject, FloorObjectType } from "@/features/floor-plan/core/Canvas";
import { FloorProvider, useFloor } from "@/features/floor-plan/core/floor-context";
import { FloorSelector } from "@/features/floor-plan/core/FloorSelector";
import { FloorManagerModal } from "@/features/floor-plan/core/FloorManagerModal";
import { ArchitecturePropertiesPanel } from "@/features/floor-plan/core/ArchitecturePropertiesPanel";
import { snapToNearestWall } from "@/helpers/wall-math";
import { getFloorObjects, bulkSaveFloorObjects } from "@/lib/supabase/floor-object-queries";
import { Loader2, Save, Trash2, CheckCircle2, Building2, BrickWall, DoorOpen, Square, Columns, MousePointer2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { RightDrawer } from "@/components/ui/right-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/PageHeader";

// --- Type Mappers ---
function canvasTypeToDbType(type: FloorObjectType): "wall" | "door" | "window" | "pillar" | null {
    if (type === "column") return "pillar";
    if (type === "wall" || type === "door" || type === "window") return type;
    return null;
}

function dbTypeToCanvasType(dbType: string): FloorObjectType {
    if (dbType === "pillar") return "column";
    return dbType as FloorObjectType;
}

// --- Architecture Tools ---
const ARCHITECTURE_TOOLS: { id: FloorObjectType | "select"; label: string; icon: React.ElementType }[] = [
    { id: "select", label: "Selección", icon: MousePointer2 },
    { id: "wall", label: "Pared", icon: BrickWall },
    { id: "door", label: "Puerta", icon: DoorOpen },
    { id: "window", label: "Ventana", icon: Square },
    { id: "column", label: "Columna", icon: Columns },
];

// --- Inner Component ---
interface FloorArchitectureCanvasProps {
    restaurantId: string;
}

function FloorArchitectureCanvasInner({ restaurantId }: FloorArchitectureCanvasProps) {
    const { selectedFloorId, selectedFloor, floors, openModal, isLoading: floorsLoading } = useFloor();
    const [objects, setObjects] = useState<FloorObject[]>([]);
    const [selectedTool, setSelectedTool] = useState<FloorObjectType | "select" | null>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [objectsLoading, setObjectsLoading] = useState(true);

    // Mobile toolbar popover
    const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
    const mobileToolsRef = useRef<HTMLDivElement>(null);

    const updateObjects = (newObjects: React.SetStateAction<FloorObject[]>) => {
        setObjects(newObjects);
        setHasChanges(true);
    };

    useEffect(() => {
        if (selectedFloorId) {
            loadFloorObjects();
        } else if (!floorsLoading) {
            setObjectsLoading(false);
        }
    }, [selectedFloorId, floorsLoading]);

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

    const loadFloorObjects = async () => {
        if (!selectedFloorId) return;
        setObjectsLoading(true);
        const { data } = await getFloorObjects(selectedFloorId);

        if (data) {
            const canvasObjects: FloorObject[] = data
                .filter(o => ['wall', 'window', 'door', 'pillar'].includes(o.type))
                .map(dbObj => ({
                    id: dbObj.id,
                    type: dbTypeToCanvasType(dbObj.type),
                    x: Number(dbObj.x),
                    y: Number(dbObj.y),
                    width: Number(dbObj.width),
                    height: Number(dbObj.height),
                    rotation: Number(dbObj.angle),
                    alignment: dbObj.properties?.alignment,
                    doorType: dbObj.properties?.doorType,
                    swingDirection: dbObj.properties?.swingDirection,
                    attachedWallId: dbObj.properties?.attachedWallId,
                    shape: dbObj.properties?.shape,
                }));

            setObjects(canvasObjects);
            setHasChanges(false);
        }
        setObjectsLoading(false);
    };

    const handleSave = async () => {
        if (!selectedFloorId) return;
        setSaving(true);

        const architectureObjects = objects.filter(obj =>
            obj.type === "wall" || obj.type === "door" || obj.type === "window" || obj.type === "column"
        );

        const dbObjects = architectureObjects.map(obj => {
            const dbType = canvasTypeToDbType(obj.type);
            if (!dbType) return null;
            return {
                id: obj.id,
                type: dbType,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                angle: obj.rotation,
                properties: {
                    alignment: obj.alignment,
                    doorType: obj.doorType,
                    swingDirection: obj.swingDirection,
                    attachedWallId: obj.attachedWallId,
                    shape: obj.shape,
                },
            };
        }).filter(Boolean) as any[];

        const { error } = await bulkSaveFloorObjects(selectedFloorId, dbObjects);
        setSaving(false);
        if (!error) setHasChanges(false);
    };

    const handleObjectUpdate = (updates: Partial<FloorObject>) => {
        if (!selectedId) return;
        updateObjects(prev => prev.map(obj => {
            if (obj.id === selectedId) {
                const newObj = { ...obj, ...updates };
                if (newObj.attachedWallId) {
                    const wall = prev.find(w => w.id === newObj.attachedWallId);
                    if (wall) {
                        const snapResult = snapToNearestWall(
                            { x: newObj.x + newObj.width / 2, y: newObj.y + newObj.height / 2 },
                            [wall],
                            Infinity,
                            newObj.width
                        );
                        if (snapResult) {
                            newObj.x = snapResult.x - newObj.width / 2;
                            newObj.y = snapResult.y - newObj.height / 2;
                        }
                    }
                }
                return newObj;
            }
            return obj;
        }));
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

    const handleMobileToolSelect = (toolId: FloorObjectType | "select") => {
        setSelectedTool(toolId);
        setMobileToolsOpen(false);
    };

    const selectedObject = objects.find(o => o.id === selectedId);

    // Show loader while floors or objects are loading
    if (floorsLoading || objectsLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    // Only show empty state AFTER loading completes and floors is truly empty
    if (!selectedFloorId && floors.length === 0) {
        return (
            <div className="h-full p-8 flex items-center justify-center">
                <EmptyState
                    title="No hay pisos creados"
                    description="Comienza creando el primer piso para tu restaurante."
                    icon={Building2}
                    actionLabel="Crear Primer Piso"
                    onAction={() => openModal?.('create')}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-0 relative">
            {/* Header - Responsive */}
            <PageHeader
                icon={Building2}
                title="Arquitectura"
                subtitle={selectedFloor?.name}
                actions={
                    <div className="flex items-center gap-1 sm:gap-2">
                        <FloorSelector restaurantId={restaurantId} allowModification={true} />

                        {(selectedId || selectedIds.size > 0) && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center justify-center h-8 w-8 sm:w-auto sm:px-3 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors shadow-sm",
                                hasChanges
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "bg-muted text-muted-foreground border border-border"
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
                    onSelectId={setSelectedId}
                    selectedIds={selectedIds}
                    onMultiSelect={setSelectedIds}
                    showDimensions={true}
                />

                {/* Desktop Floating Tools Dock */}
                <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-3 p-2 rounded-full bg-background/90 backdrop-blur border shadow-xl z-20">
                    {ARCHITECTURE_TOOLS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 border font-medium text-sm",
                                selectedTool === tool.id
                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
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
                    {/* Selected Tool Indicator + Open Button */}
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
                                    const tool = ARCHITECTURE_TOOLS.find(t => t.id === selectedTool);
                                    if (tool) return <tool.icon size={20} className="text-primary" />;
                                    return <Plus size={20} />;
                                })()}
                                <span className="font-medium text-sm">
                                    {ARCHITECTURE_TOOLS.find(t => t.id === selectedTool)?.label}
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
                            {ARCHITECTURE_TOOLS.map((tool, index) => (
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
                isOpen={!!selectedObject}
                onClose={() => setSelectedId(null)}
                title={
                    selectedObject?.type === 'wall' ? 'Propiedades de Pared' :
                        selectedObject?.type === 'door' ? 'Propiedades de Puerta' :
                            selectedObject?.type === 'window' ? 'Propiedades de Ventana' :
                                selectedObject?.type === 'column' ? 'Propiedades de Columna' : 'Propiedades'
                }
            >
                {selectedObject && (
                    <ArchitecturePropertiesPanel object={selectedObject} onChange={handleObjectUpdate} />
                )}
            </RightDrawer>

            {/* Floor Manager Modal */}
            <FloorManagerModal restaurantId={restaurantId} />
        </div>
    );
}

export function FloorArchitectureCanvas({ restaurantId }: FloorArchitectureCanvasProps) {
    if (!restaurantId) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
    }

    return (
        <FloorProvider restaurantId={restaurantId}>
            <FloorArchitectureCanvasInner restaurantId={restaurantId} />
        </FloorProvider>
    );
}
