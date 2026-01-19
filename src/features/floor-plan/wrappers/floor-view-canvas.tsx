"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, FloorObject } from "@/features/floor-plan/core/Canvas";
import { FloorProvider, useFloor } from "@/features/floor-plan/core/floor-context";
import { getFloorObjects } from "@/lib/supabase/floor-object-queries";
import { getTables } from "@/lib/supabase/table-queries";
import { Loader2, Armchair } from "lucide-react";
import { cn } from "@/lib/utils";
import { RightDrawer } from "@/components/ui/right-drawer";
import { TableServicePanel } from "@/components/dashboard/TableServicePanel";
import { EmptyState } from "@/components/ui/empty-state";

// --- Data Mappers ---
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

function tableDbToCanvas(t: any): FloorObject {
    return {
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
        status: t.status,
        current_pax: t.current_pax,
        customerName: t.customers?.first_name,
        seating: t.seating || {
            top: { enabled: true, type: "chair" },
            right: { enabled: true, type: "chair" },
            bottom: { enabled: true, type: "chair" },
            left: { enabled: true, type: "chair" },
        }
    } as FloorObject;
}

// --- Single Floor View Component ---
interface SingleFloorViewProps {
    floorId: string;
    floorName: string;
    isActive: boolean;
    onSelect: () => void;
    restaurantId: string;
}

function SingleFloorView({ floorId, floorName, isActive, onSelect, restaurantId }: SingleFloorViewProps) {
    const [tables, setTables] = useState<FloorObject[]>([]);
    const [architecture, setArchitecture] = useState<FloorObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
            setTables(tablesRes.data.map(tableDbToCanvas));
        }
        setLoading(false);
    };

    const selectedObject = tables.find(t => t.id === selectedId);

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
                <div className="bg-background/80 backdrop-blur border border-border px-3 py-1.5 rounded-lg shadow-sm">
                    <span className="font-bold text-sm tracking-tight">{floorName}</span>
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
                        setObjects={() => { }} // Read-only
                        backgroundObjects={architecture}
                        selectedTool={isActive ? "select" : null}
                        onSelectTool={() => { }}
                        selectedId={selectedId}
                        onSelectId={setSelectedId}
                        selectedIds={new Set()}
                        onMultiSelect={() => { }}
                        showDimensions={false}
                        showGrid={false}
                    />
                </div>
            )}

            <RightDrawer
                isOpen={!!selectedId}
                onClose={() => setSelectedId(null)}
                title={`Servicio - ${floorName}`}
            >
                {selectedObject && selectedObject.type === 'table' && (
                    <TableServicePanel
                        table={selectedObject}
                        onUpdate={() => loadData()}
                        restaurantId={restaurantId}
                    />
                )}
            </RightDrawer>
        </div>
    );
}

// --- Main Wrapper Component ---
interface FloorViewCanvasProps {
    restaurantId: string;
}

function FloorViewCanvasInner({ restaurantId }: FloorViewCanvasProps) {
    const { floors, isLoading } = useFloor();
    const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

    useEffect(() => {
        if (floors.length > 0 && !activeFloorId) {
            setActiveFloorId(floors[0].id);
        }
    }, [floors, activeFloorId]);

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

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

    const gridCols = floors.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2";

    return (
        <div className={cn("grid gap-4 h-full w-full p-4 overflow-hidden", gridCols)}>
            {floors.map(floor => (
                <SingleFloorView
                    key={floor.id}
                    floorId={floor.id}
                    floorName={floor.name}
                    isActive={activeFloorId === floor.id}
                    onSelect={() => setActiveFloorId(floor.id)}
                    restaurantId={restaurantId}
                />
            ))}
        </div>
    );
}

export function FloorViewCanvas({ restaurantId }: FloorViewCanvasProps) {
    if (!restaurantId) {
        return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
    }

    return (
        <FloorProvider restaurantId={restaurantId}>
            <FloorViewCanvasInner restaurantId={restaurantId} />
        </FloorProvider>
    );
}
