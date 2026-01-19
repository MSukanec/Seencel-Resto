import { FloorObject, TableShape, SeatConfig, ChairType } from "./Canvas";
import { Ruler, RotateCcw, Circle, RectangleHorizontal, Utensils, Link2, Unlink2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePropertiesFormProps {
    object: FloorObject;
    onChange: (updates: Partial<FloorObject>) => void;
    label?: string;
    // For merge functionality
    allTables?: FloorObject[];
    isMergeMode?: boolean;
    onStartMergeMode?: () => void;
    onCancelMergeMode?: () => void;
    onUnmergeTables?: (groupId: string) => void;
}

export function TablePropertiesForm({
    object,
    onChange,
    label,
    allTables,
    isMergeMode,
    onStartMergeMode,
    onCancelMergeMode,
    onUnmergeTables
}: TablePropertiesFormProps) {
    const shape = object.shape || "rectangular";
    const rotation = object.rotation || 0;
    const seating = object.seating || {
        top: { enabled: false, type: "chair" as ChairType },
        right: { enabled: false, type: "chair" as ChairType },
        bottom: { enabled: false, type: "chair" as ChairType },
        left: { enabled: false, type: "chair" as ChairType },
    };

    // Find other tables in the same merged group
    const mergedTables = object.mergedGroup && allTables
        ? allTables.filter(t => t.mergedGroup === object.mergedGroup).sort((a, b) => (a.label || '').localeCompare(b.label || ''))
        : [];

    const isMerged = mergedTables.length > 1;

    // Tables available for merging
    const availableForMerge = allTables?.filter(t =>
        t.id !== object.id && !t.mergedGroup && t.type === 'table'
    ) || [];

    const handleShapeChange = (newShape: TableShape) => {
        onChange({ shape: newShape });
    };

    const handleRotationChange = (value: number) => {
        const snapPoints = [0, 45, 90, 135, 180, 225, 270, 315, 360];
        const snapped = snapPoints.find(snap => Math.abs(value - snap) <= 3);
        onChange({ rotation: snapped !== undefined ? snapped : value });
    };

    const handleSeatingChange = (side: keyof typeof seating, updates: Partial<SeatConfig>) => {
        onChange({
            seating: {
                ...seating,
                [side]: { ...seating[side]!, ...updates },
            },
        });
    };

    const handleUnmerge = () => {
        if (object.mergedGroup && onUnmergeTables) {
            onUnmergeTables(object.mergedGroup);
        }
    };

    // Determine which seating sides are blocked
    const getBlockedSides = (): Set<string> => {
        if (!isMerged || !allTables) return new Set();
        const blocked = new Set<string>();
        const sortedMerged = mergedTables;
        const myIndex = sortedMerged.findIndex(t => t.id === object.id);
        if (myIndex > 0) blocked.add('left');
        if (myIndex < sortedMerged.length - 1) blocked.add('right');
        return blocked;
    };

    const blockedSides = getBlockedSides();

    return (
        <div className="space-y-4">
            {/* Merged info - compact */}
            {isMerged && (
                <p className="text-xs text-muted-foreground bg-accent/50 px-2 py-1 rounded">
                    Unida con: {mergedTables.map(t => t.label).join(' + ')}
                </p>
            )}

            {/* Shape + Dimensions in row */}
            <div className="flex gap-3">
                {/* Shape buttons - compact */}
                <div className="flex gap-1">
                    <button
                        onClick={() => handleShapeChange("rectangular")}
                        className={cn(
                            "p-2 rounded-md border",
                            shape === "rectangular" || shape === "square"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-accent"
                        )}
                        title="Rectangular"
                    >
                        <RectangleHorizontal size={18} />
                    </button>
                    <button
                        onClick={() => handleShapeChange("circular")}
                        className={cn(
                            "p-2 rounded-md border",
                            shape === "circular"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-accent"
                        )}
                        title="Circular"
                    >
                        <Circle size={18} />
                    </button>
                </div>

                {/* Dimensions - inline */}
                {shape === "circular" ? (
                    <div className="flex items-center gap-2 flex-1">
                        <Ruler size={14} className="text-muted-foreground" />
                        <input
                            type="number"
                            value={Math.round(object.width)}
                            onChange={(e) => {
                                const d = Number(e.target.value);
                                onChange({ width: d, height: d });
                            }}
                            className="w-16 bg-input border border-border rounded px-2 py-1 text-sm"
                            min={20}
                        />
                        <span className="text-xs text-muted-foreground">cm</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            type="number"
                            value={Math.round(object.width)}
                            onChange={(e) => onChange({ width: Number(e.target.value) })}
                            className="w-14 bg-input border border-border rounded px-2 py-1 text-sm"
                            min={20}
                            title="Ancho"
                        />
                        <span className="text-muted-foreground">×</span>
                        <input
                            type="number"
                            value={Math.round(object.height)}
                            onChange={(e) => onChange({ height: Number(e.target.value) })}
                            className="w-14 bg-input border border-border rounded px-2 py-1 text-sm"
                            min={20}
                            title="Alto"
                        />
                        <span className="text-xs text-muted-foreground">cm</span>
                    </div>
                )}
            </div>

            {/* Rotation - compact slider */}
            <div className="flex items-center gap-3">
                <RotateCcw size={14} className="text-muted-foreground" />
                <input
                    type="range"
                    min="0"
                    max="90"
                    step="15"
                    value={Math.min(rotation, 90)}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="flex-1 h-1"
                />
                <span className="text-xs text-muted-foreground w-8">{rotation}°</span>
            </div>

            {/* Seating - more compact visual */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Asientos</label>
                <div className="grid grid-cols-3 grid-rows-3 gap-1 items-center justify-items-center p-3 bg-accent/30 rounded-lg w-fit mx-auto">
                    {/* Top */}
                    <div className="col-start-2 row-start-1">
                        <input
                            type="checkbox"
                            checked={seating.top?.enabled}
                            onChange={(e) => handleSeatingChange("top", { enabled: e.target.checked })}
                            className="rounded w-3.5 h-3.5"
                            disabled={blockedSides.has('top')}
                        />
                    </div>
                    {/* Left */}
                    <div className="col-start-1 row-start-2">
                        <input
                            type="checkbox"
                            checked={seating.left?.enabled && !blockedSides.has('left')}
                            onChange={(e) => handleSeatingChange("left", { enabled: e.target.checked })}
                            className={cn("rounded w-3.5 h-3.5", blockedSides.has('left') && "opacity-30")}
                            disabled={blockedSides.has('left')}
                        />
                    </div>
                    {/* Center - seat count */}
                    <div className="col-start-2 row-start-2">
                        <div className="w-12 h-12 bg-primary/10 border border-primary/50 rounded flex flex-col items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                                {(seating.top?.enabled && !blockedSides.has('top') ? 1 : 0) +
                                    (seating.right?.enabled && !blockedSides.has('right') ? 1 : 0) +
                                    (seating.bottom?.enabled && !blockedSides.has('bottom') ? 1 : 0) +
                                    (seating.left?.enabled && !blockedSides.has('left') ? 1 : 0)}
                            </span>
                        </div>
                    </div>
                    {/* Right */}
                    <div className="col-start-3 row-start-2">
                        <input
                            type="checkbox"
                            checked={seating.right?.enabled && !blockedSides.has('right')}
                            onChange={(e) => handleSeatingChange("right", { enabled: e.target.checked })}
                            className={cn("rounded w-3.5 h-3.5", blockedSides.has('right') && "opacity-30")}
                            disabled={blockedSides.has('right')}
                        />
                    </div>
                    {/* Bottom */}
                    <div className="col-start-2 row-start-3">
                        <input
                            type="checkbox"
                            checked={seating.bottom?.enabled}
                            onChange={(e) => handleSeatingChange("bottom", { enabled: e.target.checked })}
                            className="rounded w-3.5 h-3.5"
                            disabled={blockedSides.has('bottom')}
                        />
                    </div>
                </div>
            </div>

            {/* Merge Section - compact at bottom */}
            {(allTables && (onStartMergeMode || onUnmergeTables)) && (
                <div className="pt-3 border-t border-border">
                    {isMerged ? (
                        <button
                            onClick={handleUnmerge}
                            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-md"
                        >
                            <Unlink2 size={14} />
                            Separar Mesas
                        </button>
                    ) : isMergeMode ? (
                        <div className="space-y-2">
                            <p className="text-xs text-primary font-medium animate-pulse text-center">
                                ⬅ Clickea otra mesa en el plano
                            </p>
                            <button
                                onClick={onCancelMergeMode}
                                className="w-full px-3 py-1.5 text-sm text-muted-foreground bg-muted hover:bg-accent rounded-md"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onStartMergeMode}
                            disabled={availableForMerge.length === 0}
                            className={cn(
                                "flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-md",
                                availableForMerge.length > 0
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            <Link2 size={14} />
                            Unir con otra mesa
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
