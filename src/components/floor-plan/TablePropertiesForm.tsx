import { useState } from "react";
import { FloorObject, TableShape, SeatConfig, ChairType } from "./Canvas";
import { Ruler, RotateCcw, Square, Circle, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePropertiesFormProps {
    object: FloorObject;
    onChange: (updates: Partial<FloorObject>) => void;
    label?: string; // Table label/ID from database
}

export function TablePropertiesForm({ object, onChange, label }: TablePropertiesFormProps) {
    const shape = object.shape || "rectangular";
    const rotation = object.rotation || 0;
    const seating = object.seating || {
        top: { enabled: false, type: "chair" as ChairType },
        right: { enabled: false, type: "chair" as ChairType },
        bottom: { enabled: false, type: "chair" as ChairType },
        left: { enabled: false, type: "chair" as ChairType },
    };

    const handleShapeChange = (newShape: TableShape) => {
        onChange({ shape: newShape });
    };

    const handleRotationChange = (value: number) => {
        // Snap to 45° if within 3° of a snap point
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

    return (
        <div className="space-y-6">
            {/* Table ID/Label - Editable */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">ID de Mesa</label>
                <input
                    type="text"
                    value={object.label || ''}
                    onChange={(e) => onChange({ label: e.target.value })}
                    placeholder="Ej: Mesa 1, VIP 3..."
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-medium"
                />
            </div>

            {/* Shape Selector - Only Rectangular and Circular */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Forma</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleShapeChange("rectangular")}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-md border transition-colors",
                            shape === "rectangular" || shape === "square"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-accent"
                        )}
                    >
                        <RectangleHorizontal size={20} />
                        <span className="text-xs">Rectangular</span>
                    </button>
                    <button
                        onClick={() => handleShapeChange("circular")}
                        className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-md border transition-colors",
                            shape === "circular"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-accent"
                        )}
                    >
                        <Circle size={20} />
                        <span className="text-xs">Circular</span>
                    </button>
                </div>
            </div>

            {/* Dimensions */}
            {shape === "circular" ? (
                /* Circular - Only Diameter */
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Ruler size={16} className="text-primary" /> Diámetro
                    </label>
                    <input
                        type="number"
                        value={Math.round(object.width)}
                        onChange={(e) => {
                            const diameter = Number(e.target.value);
                            onChange({ width: diameter, height: diameter });
                        }}
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                        min={20}
                    />
                </div>
            ) : (
                /* Rectangular - Width and Height */
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Ruler size={16} className="text-primary" /> Ancho
                        </label>
                        <input
                            type="number"
                            value={Math.round(object.width)}
                            onChange={(e) => onChange({ width: Number(e.target.value) })}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                            min={20}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Ruler size={16} className="text-primary" /> Alto
                        </label>
                        <input
                            type="number"
                            value={Math.round(object.height)}
                            onChange={(e) => onChange({ height: Number(e.target.value) })}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                            min={20}
                        />
                    </div>
                </div>
            )}

            {/* Rotation Slider */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <RotateCcw size={16} className="text-primary" /> Rotación: {rotation}°
                </label>
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={rotation}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0°</span>
                    <span>90°</span>
                    <span>180°</span>
                    <span>270°</span>
                    <span>360°</span>
                </div>
            </div>

            {/* Seating Configuration */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Configuración de Asientos</label>

                {/* Visual Diagram */}
                <div className="relative flex items-center justify-center p-8 bg-accent/20 rounded-lg">
                    <div className="relative w-32 h-32 bg-primary/10 border-2 border-primary rounded-md"></div>

                    {/* Top */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={seating.top?.enabled}
                                onChange={(e) => handleSeatingChange("top", { enabled: e.target.checked })}
                                className="rounded"
                            />
                            Arriba
                        </label>
                        {seating.top?.enabled && (
                            <select
                                value={seating.top?.type}
                                onChange={(e) => handleSeatingChange("top", { type: e.target.value as ChairType })}
                                className="text-xs bg-background border rounded px-1 py-0.5"
                            >
                                <option value="chair">Silla</option>
                                <option value="wheelchair">Silla de ruedas</option>
                                <option value="child">Silla de niños</option>
                            </select>
                        )}
                    </div>

                    {/* Right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={seating.right?.enabled}
                                onChange={(e) => handleSeatingChange("right", { enabled: e.target.checked })}
                                className="rounded"
                            />
                            Derecha
                        </label>
                        {seating.right?.enabled && (
                            <select
                                value={seating.right?.type}
                                onChange={(e) => handleSeatingChange("right", { type: e.target.value as ChairType })}
                                className="text-xs bg-background border rounded px-1 py-0.5"
                            >
                                <option value="chair">Silla</option>
                                <option value="wheelchair">Silla de ruedas</option>
                                <option value="child">Silla de niños</option>
                            </select>
                        )}
                    </div>

                    {/* Bottom */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={seating.bottom?.enabled}
                                onChange={(e) => handleSeatingChange("bottom", { enabled: e.target.checked })}
                                className="rounded"
                            />
                            Abajo
                        </label>
                        {seating.bottom?.enabled && (
                            <select
                                value={seating.bottom?.type}
                                onChange={(e) => handleSeatingChange("bottom", { type: e.target.value as ChairType })}
                                className="text-xs bg-background border rounded px-1 py-0.5"
                            >
                                <option value="chair">Silla</option>
                                <option value="wheelchair">Silla de ruedas</option>
                                <option value="child">Silla de niños</option>
                            </select>
                        )}
                    </div>

                    {/* Left */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={seating.left?.enabled}
                                onChange={(e) => handleSeatingChange("left", { enabled: e.target.checked })}
                                className="rounded"
                            />
                            Izquierda
                        </label>
                        {seating.left?.enabled && (
                            <select
                                value={seating.left?.type}
                                onChange={(e) => handleSeatingChange("left", { type: e.target.value as ChairType })}
                                className="text-xs bg-background border rounded px-1 py-0.5"
                            >
                                <option value="chair">Silla</option>
                                <option value="wheelchair">Silla de ruedas</option>
                                <option value="child">Silla de niños</option>
                            </select>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
