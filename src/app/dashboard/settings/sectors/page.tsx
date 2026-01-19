"use client";

import { useState, useEffect } from "react";
import { ChefHat, Plus, Loader2 } from "lucide-react";
import {
    getSectors,
    deleteSector,
    updateSectorPositions,
    type KitchenSector
} from "@/lib/supabase/sector-queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSector, SectorFormModal } from "@/features/sectors";

export default function SectorsSettingsPage() {
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [sectors, setSectors] = useState<KitchenSector[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSector, setEditingSector] = useState<KitchenSector | null>(null);
    const confirm = useConfirm();

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const id = document.cookie.match(/(^| )selected_restaurant_id=([^;]+)/)?.[2];
        if (id) {
            setRestaurantId(id);
            loadSectors(id);
        } else {
            setLoading(false);
        }
    }, []);

    const loadSectors = async (id?: string) => {
        const restId = id || restaurantId;
        if (!restId) return;
        setLoading(true);
        const { data } = await getSectors(restId);
        setSectors(data || []);
        setLoading(false);
    };

    const handleEdit = (sector: KitchenSector) => {
        setEditingSector(sector);
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: "Eliminar Sector",
            message: "¿Estás seguro de eliminar este sector? Los items de menú asociados perderán su asignación.",
            confirmText: "Eliminar",
            variant: "danger"
        });
        if (!confirmed) return;

        const { error } = await deleteSector(id);
        if (!error) loadSectors();
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = sectors.findIndex(s => s.id === active.id);
        const newIndex = sectors.findIndex(s => s.id === over.id);

        const newSectors = arrayMove(sectors, oldIndex, newIndex);
        setSectors(newSectors);

        const updates = newSectors.map((sector, idx) => ({ id: sector.id, position: idx }));
        const { error } = await updateSectorPositions(updates);
        if (error) loadSectors(); // Revert on error
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditingSector(null);
    };

    const handleSuccess = () => {
        loadSectors();
        handleModalClose();
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-muted/30">
                <PageHeader
                    icon={ChefHat}
                    title="Sectores de Cocina"
                    subtitle="Configura los sectores para rutear pedidos"
                />
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={ChefHat}
                title="Sectores de Cocina"
                subtitle={`${sectors.length} sectores configurados`}
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} />
                        Nuevo Sector
                    </button>
                }
            />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
                {/* Sectors List */}
                {sectors.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No hay sectores configurados</p>
                        <p className="text-sm">Crea sectores para organizar tus pedidos</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sectors.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {sectors.map((sector) => (
                                    <SortableSector
                                        key={sector.id}
                                        sector={sector}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Modal */}
            {restaurantId && (
                <SectorFormModal
                    isOpen={showModal}
                    onClose={handleModalClose}
                    onSuccess={handleSuccess}
                    restaurantId={restaurantId}
                    editingSector={editingSector}
                />
            )}
        </div>
    );
}
