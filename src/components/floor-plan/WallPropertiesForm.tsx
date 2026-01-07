import { useState, useEffect } from "react";
import { Copy, AlignCenter, AlignLeft, AlignRight, Ruler } from "lucide-react";
import { FloorObject, WallAlignment } from "./Canvas";
import { getWallEndpoints, getWallFromPoints } from "@/helpers/wall-math";
import { cn } from "@/lib/utils";

interface WallPropertiesFormProps {
    object: FloorObject;
    onChange: (updates: Partial<FloorObject>) => void;
}

export function WallPropertiesForm({ object, onChange }: WallPropertiesFormProps) {
    // Local state for immediate feedback? Or just drive from props.
    // Driving from props is safer to avoid sync issues.

    // Derived values
    const thickness = object.height;
    const alignment = object.alignment || "center";

    const handleThicknessChange = (newThickness: number) => {
        // Calculate new geometry preserving reference line
        const { start, end } = getWallEndpoints(object);
        const newGeo = getWallFromPoints(start, end, newThickness, alignment);
        onChange(newGeo);
    };

    const handleAlignmentChange = (newAlignment: WallAlignment) => {
        // Calculate new geometry preserving reference line
        const { start, end } = getWallEndpoints(object);
        const newGeo = getWallFromPoints(start, end, thickness, newAlignment);
        onChange(newGeo);
    };

    return (
        <div className="space-y-6">
            {/* Header Removed as per request */}
            {/* <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border"> ... </div> */}

            {/* Thickness Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Ruler size={16} className="text-primary" /> Grosor (cm)
                </label>
                <input
                    type="number"
                    value={Math.round(thickness)}
                    onChange={(e) => handleThicknessChange(Number(e.target.value))}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    min={1}
                />
            </div>

            {/* Alignment Selector */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    Posicionamiento
                </label>
                <div className="flex gap-1 bg-input p-1 rounded-md border border-border">
                    <button
                        onClick={() => handleAlignmentChange("left")}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center py-2 rounded-sm text-xs gap-1 transition-colors",
                            alignment === "left" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                        title="Izquierda (Exterior)"
                    >
                        <AlignLeft size={16} />
                        <span>Izq</span>
                    </button>
                    <button
                        onClick={() => handleAlignmentChange("center")}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center py-2 rounded-sm text-xs gap-1 transition-colors",
                            alignment === "center" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                        title="Centro"
                    >
                        <AlignCenter size={16} />
                        <span>Centro</span>
                    </button>
                    <button
                        onClick={() => handleAlignmentChange("right")}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center py-2 rounded-sm text-xs gap-1 transition-colors",
                            alignment === "right" ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                        title="Derecha (Interior)"
                    >
                        <AlignRight size={16} />
                        <span>Der</span>
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Define de qué lado del eje de referencia crece el grosor del muro.
                </p>
            </div>
        </div>
    );
}
