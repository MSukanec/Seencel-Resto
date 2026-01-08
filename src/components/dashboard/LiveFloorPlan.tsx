"use client";


import { useState, useEffect, useRef, useCallback } from "react";
import { Canvas, FloorObject, FloorObjectType } from "@/components/floor-plan/Canvas";
import { useFloor } from "@/contexts/FloorContext";
import { getFloorObjects } from "@/lib/supabase/floor-object-queries";
import { getTables, bulkSaveTables, TableInsert } from "@/lib/supabase/table-queries";
import { Loader2, Save, CheckCircle2, Armchair, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RightDrawer } from "@/components/ui/right-drawer";
import { TableServicePanel } from "@/components/dashboard/TableServicePanel";
import { EmptyState } from "@/components/ui/empty-state";
// Remove FloorSelector - we will show ALL floors
// import { FloorSelector } from "@/components/floor-plan/FloorSelector";

// --- Types & Mappers ---
function canvasToTableDb(obj: FloorObject, floorId: string): Omit<TableInsert, "floor_id"> | null {
    if (obj.type !== "table" && obj.type !== "bar") return null;
    return {
        id: obj.id, // Critical: Include ID for UPSERT to work
        label: obj.label || `Mesa ${obj.id.slice(0, 4)}`,
        x: obj.x,
        y: obj.y,
        width: Math.round(obj.width),
        height: Math.round(obj.height),
        shape: (() => {
            const s = (obj.shape || "rectangular").toLowerCase();
            if (s.includes("rect")) return "rectangle";
            if (s.includes("circ") || s.includes("round")) return "circle";
            if (s.includes("square")) return "square";
            return "rectangle";
        })() as "rectangle" | "circle" | "square",
        seats: obj.seats || 4,
        angle: Math.round(obj.rotation)
    };
}

function archDbToCanvas(dbObj: any): FloorObject {
    return {
        id: dbObj.id,
        type: dbObj.type === "pillar" ? "column" : dbObj.type as any,
        x: Number(dbObj.x),
        y: Number(dbObj.y),
        width: Number(dbObj.width),
        height: Number(dbObj.height),
        rotation: Number(dbObj.angle),
        alignment: dbObj.properties?.alignment,
        doorType: dbObj.properties?.doorType,
        swingDirection: dbObj.properties?.swingDirection,
        attachedWallId: dbObj.properties?.attachedWallId
    };
}

// --- Single Floor Canvas Component ---
interface SingleFloorViewProps {
    floorId: string;
    floorName: string;
    isActive: boolean;
    onSelect: () => void;
    // Shared Tools/State
    selectedTool: FloorObjectType | "select" | null;
    onSelectTool: (tool: FloorObjectType | "select" | null) => void;
}

function SingleFloorView({ floorId, floorName, isActive, onSelect, selectedTool, onSelectTool }: SingleFloorViewProps) {
    const [tables, setTables] = useState<FloorObject[]>([]);
    const [architecture, setArchitecture] = useState<FloorObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Tools State (Local per canvas for interactions, but tool selection is global)
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Drawer State (Lifted up or local? Local seems easier for now, but we want one drawer)
    const [propertiesOpen, setPropertiesOpen] = useState(false);
    const selectedObject = tables.find(t => t.id === selectedId);

    // Refs for Auto-Save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstLoad = useRef(true);

    // Load Data
    useEffect(() => {
        loadData();
    }, [floorId]);

    const loadData = async () => {
        setLoading(true);
        const [archRes, tablesRes] = await Promise.all([
            getFloorObjects(floorId),
            getTables(floorId)
        ]);

        if (archRes.data) {
            setArchitecture(archRes.data
                .filter(o => ['wall', 'window', 'door', 'pillar'].includes(o.type))
                .map(archDbToCanvas));
        }

        if (tablesRes.data) {
            setTables(tablesRes.data.map(t => ({
                id: t.id,
                type: "table",
                x: Number(t.x),
                y: Number(t.y),
                width: Number(t.width),
                height: Number(t.height),
                rotation: Number(t.angle),
                shape: t.shape as any,
                seats: t.seats,
                label: t.label,
                // Service State Mapping
                status: t.status,
                current_pax: t.current_pax,
                customerName: (t as any).customers?.first_name, // Map customer name
                seating: { // Default enabled
                    top: { enabled: true, type: "chair" },
                    right: { enabled: true, type: "chair" },
                    bottom: { enabled: true, type: "chair" },
                    left: { enabled: true, type: "chair" },
                }
            })));
        }
        setLoading(false);
        setTimeout(() => { isFirstLoad.current = false; }, 500);
    };

    // Auto-Save Logic
    const handleObjectsChange = (newObjects: FloorObject[]) => {
        setTables(newObjects);
        setHasUnsavedChanges(true);

        if (isFirstLoad.current) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            saveChanges(newObjects);
        }, 2000);
    };

    const saveChanges = async (currentTables: FloorObject[]) => {
        setSaving(true);
        const dbTables = currentTables
            .map(t => canvasToTableDb(t, floorId))
            .filter(Boolean) as Omit<TableInsert, "floor_id">[];

        const { error } = await bulkSaveTables(floorId, dbTables);
        if (!error) setHasUnsavedChanges(false);
        setSaving(false);
    };

    const handleObjectUpdate = (updates: Partial<FloorObject>) => {
        if (!selectedId) return;
        const newTables = tables.map(t => t.id === selectedId ? { ...t, ...updates } : t);
        handleObjectsChange(newTables);
    };

    // Close Property Drawer if deselected
    useEffect(() => {
        if (selectedId) setPropertiesOpen(true);
        else setPropertiesOpen(false);
    }, [selectedId]);

    return (
        <div
            className={cn(
                "relative flex-1 overflow-hidden border transition-all duration-300",
                isActive ? "border-primary/50 shadow-lg z-10" : "border-border/50 hover:border-primary/20",
                "bg-background/40 backdrop-blur-sm rounded-xl flex flex-col"
            )}
            onClick={onSelect}
        >
            {/* Floor Header Badge */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <div className="bg-background/80 backdrop-blur border border-border px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                    <span className="font-bold text-sm tracking-tight">{floorName}</span>
                    {saving && <Loader2 size={12} className="animate-spin text-primary" />}
                    {hasUnsavedChanges && !saving && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="flex-1 relative">
                    <Canvas
                        objects={tables}
                        setObjects={handleObjectsChange}
                        backgroundObjects={architecture}
                        selectedTool={isActive ? selectedTool : null} // Only active floor gets tool
                        onSelectTool={onSelectTool}
                        selectedId={selectedId}
                        onSelectId={setSelectedId}
                        selectedIds={selectedIds}
                        onMultiSelect={setSelectedIds}
                        showDimensions={false}
                    />
                </div>
            )}
            {/* Service Drawer - Replaces Modal behavior for better UX */}
            <RightDrawer
                isOpen={!!selectedId}
                onClose={() => setSelectedId(null)}
                title={`Servicio - ${floorName}`}
            >
                {selectedObject && selectedObject.type === 'table' && (
                    <TableServicePanel
                        table={selectedObject}
                        onUpdate={() => loadData()}
                        restaurantId={document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'))?.[2] || ""}
                    />
                )}
            </RightDrawer>
        </div>
    );
}


// --- Main Component ---
export function LiveFloorPlan() {
    // Determine floors directly from Context
    // Error Handling: If outside provider, this throws. But we know we are inside GlobalWrapper.
    // However, GlobalWrapper MIGHT render children without provider if ID is missing.

    // SAFETY WRAPPER LOGIC:
    // We can't use `useFloor` if context is missing.
    // The previous error was specifically "useFloor must be used within a FloorProvider".
    // This implies LiveFloorPlan mounted BEFORE restaurantId was resolved.

    // Workaround: We can't conditionally call hooks.
    // Solution: Create a Safe Inner Component.

    return (
        <SafeLiveFloorPlan />
    );
}

function SafeLiveFloorPlan() {
    let context;
    try {
        context = useFloor();
    } catch (e) {
        return <div className="p-8 text-center text-muted-foreground">Cargando contexto de restaurante...</div>;
    }

    const { floors, isLoading } = context;
    const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

    // Default select first floor
    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) {
            setActiveFloorId(floors[0].id);
        }
    }, [floors, activeFloorId]);

    // WAITER MODE: Only Select/Move allowed. No creation tools.
    const selectedTool = "select";

    if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (floors.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <EmptyState
                    title="No hay pisos configurados"
                    description="Ve a Configuración > Arquitectura para crear tus pisos."
                    icon={Armchair}
                />
            </div>
        );
    }

    // Grid Layout Calculation
    // 1 Floor: 1 Col
    // 2 Floors: 2 Cols
    // 3-4 Floors: 2x2 Grid
    const gridCols = floors.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2";
    const containerClass = cn("grid gap-4 h-full w-full p-4 overflow-hidden", gridCols);

    return (
        <div className="flex flex-col h-full relative">


            {/* Smart Multi-Floor Grid */}
            <div className={containerClass}>
                {floors.map(floor => (
                    <SingleFloorView
                        key={floor.id}
                        floorId={floor.id}
                        floorName={floor.name}
                        isActive={activeFloorId === floor.id}
                        onSelect={() => setActiveFloorId(floor.id)}
                        selectedTool="select"
                        onSelectTool={() => { }} // No-op as tool selection is disabled
                    />
                ))}
            </div>
        </div>
    );
}

