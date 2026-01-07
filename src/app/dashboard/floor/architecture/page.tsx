"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Canvas, FloorObject, FloorObjectType } from "@/components/floor-plan/Canvas";
import { snapToGrid } from "@/components/floor-plan/SnapUtils";
import { snapToNearestWall } from "@/helpers/wall-math";
import { cn } from "@/lib/utils";
import { BrickWall, DoorOpen, Square, Columns, MousePointer2, Loader2, Save, Trash2, CheckCircle2, Building2 } from "lucide-react";
import { RightDrawer } from "@/components/ui/right-drawer";
import { ArchitecturePropertiesPanel } from "@/components/floor-plan/ArchitecturePropertiesPanel";
// ... imports
import { FloorSelector } from "@/components/floor-plan/FloorSelector";
import { useFloor } from "@/contexts/FloorContext";
import { getFloorObjects, bulkSaveFloorObjects } from "@/lib/supabase/floor-object-queries";
import { EmptyState } from "@/components/ui/empty-state";

// Map Canvas type to DB type
function canvasTypeToDbType(type: FloorObjectType): "wall" | "door" | "window" | "pillar" | null {
    if (type === "column") return "pillar";
    if (type === "wall" || type === "door" || type === "window") return type;
    return null; // table/bar don't go in floor_objects
}

// Map DB type to Canvas type
function dbTypeToCanvasType(dbType: string): FloorObjectType {
    if (dbType === "pillar") return "column";
    return dbType as FloorObjectType;
}

export default function ArchitecturePage() {
    const { selectedFloorId, selectedFloor } = useFloor();
    const [objects, setObjects] = useState<FloorObject[]>([]);
    const [selectedTool, setSelectedTool] = useState<FloorObjectType | "select" | null>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [loading, setLoading] = useState(true);

    const updateObjects = (newObjects: React.SetStateAction<FloorObject[]>) => {
        setObjects(newObjects);
        setHasChanges(true);
    };

    // Helper to get restaurant ID
    const getRestaurantId = () => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        return match ? match[2] : null;
    };

    const restaurantId = getRestaurantId();

    // Load objects when floor changes
    useEffect(() => {
        if (selectedFloorId) {
            loadFloorObjects();
        } else {
            setLoading(false);
        }
    }, [selectedFloorId]);

    const loadFloorObjects = async () => {
        if (!selectedFloorId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data } = await getFloorObjects(selectedFloorId);

        if (data) {
            // Convert DB objects to Canvas objects
            const canvasObjects: FloorObject[] = data.map(dbObj => ({
                id: dbObj.id,
                type: dbTypeToCanvasType(dbObj.type),
                x: Number(dbObj.x),
                y: Number(dbObj.y),
                width: Number(dbObj.width),
                height: Number(dbObj.height),
                rotation: Number(dbObj.angle),
                alignment: dbObj.properties?.alignment,
                // Door properties
                doorType: dbObj.properties?.doorType,
                swingDirection: dbObj.properties?.swingDirection,
                // New properties
                attachedWallId: dbObj.properties?.attachedWallId,
                shape: dbObj.properties?.shape,
            }));

            setObjects(canvasObjects);
            setHasChanges(false);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!selectedFloorId) {
            alert("Error: No se ha seleccionado un piso.");
            return;
        }

        setSaving(true);

        // Filter only architecture objects (not tables/bars)
        const architectureObjects = objects.filter(obj =>
            obj.type === "wall" || obj.type === "door" || obj.type === "window" || obj.type === "column"
        );

        // Convert Canvas objects to DB format
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

        if (error) {
            console.error("Save Error:", error);
            alert(`Error al guardar: ${error.message}`);
        } else {
            setHasChanges(false);
        }
    };

    const handleObjectUpdate = (updates: Partial<FloorObject>) => {
        if (!selectedId) return;

        updateObjects(prev => prev.map(obj => {
            if (obj.id === selectedId) {
                const newObj = { ...obj, ...updates };

                // REACTIVE CONSTRAINT: If object is attached to a wall, re-validate its position on every update
                // This prevents resizing from pushing the object out of the wall
                if (newObj.attachedWallId) {
                    const wall = prev.find(w => w.id === newObj.attachedWallId);
                    if (wall) {
                        const snapResult = snapToNearestWall(
                            { x: newObj.x + newObj.width / 2, y: newObj.y + newObj.height / 2 }, // Center
                            [wall],
                            Infinity,
                            newObj.width
                        );

                        if (snapResult) {
                            // Update position to be valid
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

    const tools: { id: FloorObjectType | "select"; label: string; icon: React.ElementType }[] = [
        { id: "select", label: "Selección", icon: MousePointer2 },
        { id: "wall", label: "Pared", icon: BrickWall },
        { id: "door", label: "Puerta", icon: DoorOpen },
        { id: "window", label: "Ventana", icon: Square },
        { id: "column", label: "Columna", icon: Columns },
    ];

    const selectedObject = objects.find(o => o.id === selectedId);

    const { floors, openModal } = useFloor();
    // ... rest of hooks

    if (loading) {
        return <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin" size={32} />
        </div>;
    }

    if (!selectedFloorId && floors.length === 0) {
        return (
            <div className="h-full p-8 flex items-center justify-center">
                <EmptyState
                    title="No hay pisos creados"
                    description="Comienza creando el primer piso para tu restaurante (ej. Planta Baja, Terraza) para empezar a diseñar."
                    icon={Building2}
                    actionLabel="Crear Primer Piso"
                    onAction={() => openModal && openModal('create')}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-0 relative">
            {/* Page Header with Tools */}
            <div className="flex items-center justify-between border-b border-border bg-card/30 px-6 py-3 backdrop-blur-sm z-10 relative">
                <div className="flex items-center gap-4">
                    {/* Floor Selector */}
                    {restaurantId && <FloorSelector restaurantId={restaurantId} allowModification={true} />}

                    {/* Tools moved to Canvas */}

                </div>

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

            {/* Interactive Canvas - Full Space, No Background Color */}
            <div className="flex-1 overflow-hidden relative bg-transparent">
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
            </div>

            {/* Properties Drawer */}
            <RightDrawer
                isOpen={!!selectedObject}
                onClose={() => setSelectedId(null)}
                title={
                    selectedObject?.type === 'wall' ? 'Propiedades de Pared' :
                        selectedObject?.type === 'door' ? 'Propiedades de Puerta' :
                            selectedObject?.type === 'window' ? 'Propiedades de Ventana' :
                                selectedObject?.type === 'column' ? 'Propiedades de Columna' :
                                    'Propiedades'
                }
            >
                {selectedObject && (
                    <ArchitecturePropertiesPanel
                        object={selectedObject}
                        onChange={handleObjectUpdate}
                    />
                )}
            </RightDrawer>
        </div>
    );
}
