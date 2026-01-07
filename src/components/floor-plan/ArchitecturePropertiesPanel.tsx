import { FloorObject } from "./Canvas";
import { WallPropertiesForm } from "./WallPropertiesForm";
import { Copy, Ruler, DoorOpen, Square, Columns } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArchitecturePropertiesPanelProps {
    object: FloorObject;
    onChange: (updates: Partial<FloorObject>) => void;
}

export function ArchitecturePropertiesPanel({ object, onChange }: ArchitecturePropertiesPanelProps) {

    // -- Sub-Forms inline for simplicity or extracted if complex --

    const renderDoorForm = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DoorOpen size={16} className="text-primary" /> Tipo de Puerta
                </label>
                <div className="flex gap-1 bg-input p-1 rounded-md border border-border">
                    <button
                        onClick={() => onChange({ doorType: 'single', width: 90 })}
                        className={cn(
                            "flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors",
                            (!object.doorType || object.doorType === 'single') ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        Simple
                    </button>
                    <button
                        onClick={() => onChange({ doorType: 'double', width: 140 })}
                        className={cn(
                            "flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors",
                            object.doorType === 'double' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        Doble
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Ruler size={16} className="text-primary" /> Ancho Total (cm)
                </label>
                <input
                    type="number"
                    value={Math.round(object.width)}
                    onChange={(e) => onChange({ width: Number(e.target.value) })}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>
        </div>
    );

    const renderWindowForm = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Square size={16} className="text-primary" /> Dimensiones
                </label>
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Ancho (cm)</span>
                    <input
                        type="number"
                        value={Math.round(object.width)}
                        onChange={(e) => onChange({ width: Number(e.target.value) })}
                        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>
        </div>
    );

    const renderColumnForm = () => (
        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Columns size={16} className="text-primary" /> Forma
                </label>
                <div className="flex gap-1 bg-input p-1 rounded-md border border-border">
                    <button
                        onClick={() => onChange({ shape: 'rectangular' })}
                        className={cn(
                            "flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors",
                            (!object.shape || object.shape === 'rectangular') ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        Rect
                    </button>
                    <button
                        onClick={() => {
                            // Enforce square aspect if switching to circle
                            onChange({ shape: 'circular', height: object.width });
                        }}
                        className={cn(
                            "flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors",
                            object.shape === 'circular' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        Circ
                    </button>
                    <button
                        onClick={() => onChange({ shape: 'semicircle' })}
                        className={cn(
                            "flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors",
                            object.shape === 'semicircle' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                        )}
                    >
                        Semi
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Dimensiones (cm)</label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                            {object.shape === 'circular' ? 'Diámetro' : 'Ancho'}
                        </span>
                        <input
                            type="number"
                            value={Math.round(object.width)}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                const updates: any = { width: val };
                                if (object.shape === 'circular') updates.height = val;
                                onChange(updates);
                            }}
                            className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    {object.shape !== 'circular' && (
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Profundidad</span>
                            <input
                                type="number"
                                value={Math.round(object.height)}
                                onChange={(e) => onChange({ height: Number(e.target.value) })}
                                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );


    switch (object.type) {
        case 'wall':
            return <WallPropertiesForm object={object} onChange={onChange} />;
        case 'door':
            return renderDoorForm();
        case 'window':
            return renderWindowForm();
        case 'column':
            return renderColumnForm();
        default:
            return <div className="text-sm text-muted-foreground p-4">Seleccione un elemento para ver sus propiedades.</div>;
    }
}
