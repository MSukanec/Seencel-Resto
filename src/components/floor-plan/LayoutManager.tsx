"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, getTemplates, saveTemplate, deleteTemplate } from "@/lib/supabase/template-queries";
import { Loader2, Plus, Save, Trash2, CheckCircle2, Layout, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutManagerProps {
    restaurantId: string;
    onApply: () => void; // Callback to refresh tables
    isOpen: boolean;
    onClose: () => void;
    startCreating?: boolean;
    editingTemplate?: LayoutTemplate | null; // If present, mode is EDIT
}

export function LayoutManager({ restaurantId, onApply, isOpen, onClose, startCreating = false, editingTemplate = null }: LayoutManagerProps) {
    const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // New/Edit Template State
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    // Load templates when dialog opens
    useEffect(() => {
        if (isOpen && restaurantId) {
            loadTemplates();
            if (editingTemplate) {
                // Edit Mode
                setIsCreating(true);
                setNewTemplateName(editingTemplate.name);
            } else if (startCreating) {
                // Create Mode
                setIsCreating(true);
                setNewTemplateName("");
            } else {
                setIsCreating(false);
                setNewTemplateName("");
            }
        }
    }, [isOpen, restaurantId, startCreating, editingTemplate]);

    const loadTemplates = async () => {
        setLoading(true);
        const { data } = await getTemplates(restaurantId);
        if (data) {
            setTemplates(data);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!newTemplateName.trim()) return;
        setProcessingId("save");

        if (editingTemplate) {
            // Update / Rename
            const { updateTemplate } = await import("@/lib/supabase/template-queries");
            const { data, error } = await updateTemplate(editingTemplate.id, { name: newTemplateName.trim() });
            if (data) {
                onApply(); // Refresh lists if needed
                onClose();
            } else {
                console.error(error);
                alert("Error al actualizar plantilla");
            }
        } else {
            // Create New
            const { data, error } = await saveTemplate(restaurantId, newTemplateName.trim());
            if (data) {
                setNewTemplateName("");
                onApply(); // Refresh lists (actually parent should refresh)
                onClose(); // Close after create
            } else {
                console.error(error);
                alert("Error al guardar plantilla");
            }
        }
        setProcessingId(null);
    };

    // ... (rest of render logic, update Title based on editingTemplate)

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingTemplate ? "Renombrar Plantilla" : (isCreating ? "Guardar Nueva Plantilla" : "Plantillas de Distribución")}
        >
            <div className="flex flex-col max-h-[60vh]">
                {isCreating ? (
                    <div className="flex flex-col gap-4">
                        {!editingTemplate && (
                            <div className="text-xs text-muted-foreground bg-primary/10 p-3 rounded border border-primary/20">
                                <strong>Importante:</strong> Se guardará la distribución actual de <strong>todos los pisos</strong>. Asegúrate de haber guardado tus cambios recientes.
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                                {editingTemplate ? "Nuevo Nombre" : "Nombre de la Plantilla"}
                            </label>
                            <Input
                                placeholder="Ej. Evento Corporativo..."
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                autoFocus
                                className="bg-white"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSave();
                                }}
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <Button
                                variant="ghost"
                                onClick={() => onClose()}
                                disabled={!!processingId}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={!newTemplateName.trim() || !!processingId}
                            >
                                {processingId ? <Loader2 className="animate-spin mr-2" size={14} /> : <Save className="mr-2" size={14} />}
                                {editingTemplate ? "Actualizar Nombre" : "Guardar Plantilla"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    // List Mode (Should basically act as hidden given recent changes if startCreating is true)
                    /* ... List Code ... */
                    <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
                        {/* List code if ever accessed directly?? Actually current TablesPage uses it as modal for actions */}
                        {/* BUT since new request implies editing specific template, we just use modal for the creation/editing form */}
                        {/* We can probably remove the list mode from here if it's not reachable anymore? 
                           Wait, if startCreating=false, it shows list. 
                           However, the "Template Selector" handles selection now.
                           So LayoutManager is effectively just "TemplateFormDialog".
                           Let's keep List Mode for fallback but focus on Create/Edit.
                        */}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
