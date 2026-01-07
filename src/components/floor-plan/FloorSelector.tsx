import { useState, useRef, useEffect } from "react";
import { useFloor } from "@/contexts/FloorContext";
import { Button } from "@/components/ui/button";
import { Building2, Pencil, Trash2, ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloorSelectorProps {
    restaurantId: string;
    allowModification?: boolean;
}

export function FloorSelector({ restaurantId, allowModification = false }: FloorSelectorProps) {
    const { floors, selectedFloorId, setSelectedFloorId, openModal } = useFloor();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSelect = (floorId: string) => {
        setSelectedFloorId(floorId);
        setIsOpen(false);
    };

    const handleCreateNew = () => {
        setIsOpen(false);
        openModal("create");
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const selectedFloor = floors.find(f => f.id === selectedFloorId);

    return (
        <div className="flex items-center gap-2" ref={containerRef}>
            <div className="relative">
                {/* Trigger */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm transition-all hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        <span className="truncate max-w-[120px]">
                            {floors.length === 0 ? "Sin pisos" : selectedFloor?.name || "Seleccionar..."}
                        </span>
                    </div>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {/* Dropdown Popover */}
                {isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[200px] animate-in fade-in zoom-in-95 duration-100 rounded-xl border border-border bg-popover p-1 shadow-lg shadow-black/5">
                        <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                            {floors.length === 0 && (
                                <div className="px-2 py-2 text-sm text-muted-foreground text-center">
                                    No hay pisos creados
                                </div>
                            )}

                            {floors.map((floor) => (
                                <button
                                    key={floor.id}
                                    onClick={() => handleSelect(floor.id)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                        selectedFloorId === floor.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                                    )}
                                >
                                    <span>{floor.name}</span>
                                    {selectedFloorId === floor.id && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>

                        {allowModification && (
                            <>
                                <div className="my-1 h-px bg-border/50" />
                                <button
                                    onClick={handleCreateNew}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                                >
                                    <Plus size={14} />
                                    Nuevo Piso...
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {allowModification && selectedFloor && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => openModal && openModal("edit", selectedFloor)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Editar nombre del piso"
                    >
                        <Pencil size={14} />
                    </button>

                    <button
                        onClick={() => openModal && openModal("delete", selectedFloor)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Eliminar piso actual"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}


