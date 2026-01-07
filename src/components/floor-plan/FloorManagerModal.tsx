"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Building2, Pencil, Trash2 } from "lucide-react";
import { useFloor } from "@/contexts/FloorContext";
import { createFloor, updateFloor, deleteFloor } from "@/lib/supabase/floor-queries";

interface FloorManagerModalProps {
    restaurantId: string;
}

export function FloorManagerModal({ restaurantId }: FloorManagerModalProps) {
    const { modalState, closeModal, refreshFloors, setSelectedFloorId } = useFloor();
    const { isOpen, mode, floor } = modalState;

    const [floorName, setFloorName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && mode === 'edit' && floor) {
            setFloorName(floor.name);
        } else {
            setFloorName("");
        }
        setError(null);
    }, [isOpen, mode, floor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!floorName.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (mode === 'create') {
                const { data, error } = await createFloor({
                    restaurant_id: restaurantId,
                    name: floorName.trim()
                });

                if (error) throw error;
                if (data) {
                    await refreshFloors();
                    setSelectedFloorId(data.id);
                    closeModal();
                }

            } else if (mode === 'edit' && floor) {
                const { error } = await updateFloor(floor.id, {
                    name: floorName.trim()
                });

                if (error) throw error;
                await refreshFloors();
                closeModal();
            }
        } catch (err: any) {
            console.error("Error saving floor:", err);
            setError(err.message || "Error al guardar el piso.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!floor) return;
        setIsSubmitting(true);
        try {
            const { error } = await deleteFloor(floor.id);
            if (error) throw error;

            await refreshFloors();
            // Selection logic is handled by refreshFloors mostly, but we can reset if needed
            setSelectedFloorId(null as unknown as string); // Will trigger auto-select in context
            closeModal();
        } catch (err: any) {
            console.error("Error deleting floor:", err);
            setError(err.message || "Error al eliminar el piso.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    if (mode === 'delete') {
        return (
            <Dialog isOpen={isOpen} onClose={closeModal} title="Eliminar Piso">
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                        <AlertTriangle className="text-destructive shrink-0 mt-0.5" size={20} />
                        <div className="text-sm">
                            <p className="font-medium text-destructive">¿Estás seguro de eliminar "{floor?.name}"?</p>
                            <p className="text-muted-foreground mt-1">
                                Esta acción eliminará permanentemente todos los objetos, mesas y configuraciones de este piso.
                            </p>
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="ghost" onClick={closeModal} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
                            Eliminar Piso
                        </Button>
                    </div>
                </div>
            </Dialog>
        );
    }

    const title = mode === 'create' ? "Crear Nuevo Piso" : "Editar Piso";
    const buttonLabel = mode === 'create' ? "Crear Piso" : "Guardar Cambios";

    return (
        <Dialog isOpen={isOpen} onClose={closeModal} title={title}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="floorName" className="text-sm font-medium text-foreground">
                        Nombre del Piso
                    </label>
                    <div className="relative">
                        <Input
                            id="floorName"
                            value={floorName}
                            onChange={(e) => setFloorName(e.target.value)}
                            placeholder="Ej. Primer Piso, Terraza..."
                            className="pl-9"
                            autoFocus
                        />
                        {mode === 'edit' ? (
                            <Pencil className="absolute left-3 top-3 text-muted-foreground" size={16} />
                        ) : (
                            <Building2 className="absolute left-3 top-3 text-muted-foreground" size={16} />
                        )}

                    </div>
                </div>

                {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                        {error}
                    </div>
                )}

                <div className="flex justify-between pt-2">


                    <div className="flex gap-3">
                        <Button variant="ghost" type="button" onClick={closeModal} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !floorName.trim()}>
                            {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
                            {buttonLabel}
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    );
}
