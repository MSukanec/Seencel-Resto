"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutTemplate, getTemplates, saveTemplate, deleteTemplate, duplicateTemplate } from "@/lib/supabase/template-queries";
import { Loader2, Plus, Save, Trash2, CheckCircle2, Layout, FolderOpen, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutManagerProps {
    restaurantId: string;
    onApply: (newTemplateId?: string) => void; // Callback to refresh tables, optionally with new template ID
    isOpen: boolean;
    onClose: () => void;
    startCreating?: boolean;
    editingTemplate?: LayoutTemplate | null; // If present, mode is EDIT
}

type CreationMode = 'new' | 'duplicate';

export function LayoutManager({ restaurantId, onApply, isOpen, onClose, startCreating = false, editingTemplate = null }: LayoutManagerProps) {
    const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // New/Edit Template State
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");

    // Duplication state
    const [creationMode, setCreationMode] = useState<CreationMode>('new');
    const [selectedSourceTemplate, setSelectedSourceTemplate] = useState<string | null>(null);

    // Load templates when dialog opens
    useEffect(() => {
        if (isOpen && restaurantId) {
            loadTemplates();
            if (editingTemplate) {
                // Edit Mode
                setIsCreating(true);
                setNewTemplateName(editingTemplate.name);
                setCreationMode('new');
            } else if (startCreating) {
                // Create Mode
                setIsCreating(true);
                setNewTemplateName("");
                setCreationMode('new');
                setSelectedSourceTemplate(null);
            } else {
                setIsCreating(false);
                setNewTemplateName("");
                setCreationMode('new');
                setSelectedSourceTemplate(null);
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
        } else if (creationMode === 'duplicate' && selectedSourceTemplate) {
            // Duplicate existing template
            const { data, error } = await duplicateTemplate(selectedSourceTemplate, newTemplateName.trim());
            if (data) {
                setNewTemplateName("");
                onApply(data.id); // Pass new template ID to auto-select
                onClose();
            } else {
                console.error(error);
                alert("Error al duplicar plantilla");
            }
        } else {
            // Create New
            const { data, error } = await saveTemplate(restaurantId, newTemplateName.trim());
            if (data) {
                setNewTemplateName("");
                onApply(data.id); // Pass new template ID to auto-select
                onClose(); // Close after create
            } else {
                console.error(error);
                alert("Error al guardar plantilla");
            }
        }
        setProcessingId(null);
    };

    const canSave = newTemplateName.trim() && (creationMode === 'new' || selectedSourceTemplate);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingTemplate ? "Renombrar Plantilla" : (isCreating ? "Nueva Plantilla" : "Plantillas de Distribución")}
        >
            <div className="flex flex-col max-h-[60vh]">
                {isCreating ? (
                    <div className="flex flex-col gap-4">
                        {/* Show mode selector only when creating and there are existing templates */}
                        {!editingTemplate && templates.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                                    Método de Creación
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCreationMode('new');
                                            setSelectedSourceTemplate(null);
                                        }}
                                        className={cn(
                                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                            creationMode === 'new'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <Plus size={24} className={creationMode === 'new' ? "text-primary" : "text-muted-foreground"} />
                                        <span className={cn(
                                            "text-sm font-medium",
                                            creationMode === 'new' ? "text-primary" : "text-muted-foreground"
                                        )}>Desde Cero</span>
                                        <span className="text-xs text-muted-foreground text-center">
                                            Guarda la distribución actual
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCreationMode('duplicate')}
                                        className={cn(
                                            "flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                            creationMode === 'duplicate'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <Copy size={24} className={creationMode === 'duplicate' ? "text-primary" : "text-muted-foreground"} />
                                        <span className={cn(
                                            "text-sm font-medium",
                                            creationMode === 'duplicate' ? "text-primary" : "text-muted-foreground"
                                        )}>Duplicar Existente</span>
                                        <span className="text-xs text-muted-foreground text-center">
                                            Copia una plantilla existente
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Source template selector for duplication */}
                        {!editingTemplate && creationMode === 'duplicate' && templates.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-foreground uppercase tracking-wide">
                                    Plantilla a Duplicar
                                </label>
                                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border rounded-lg p-1">
                                    {templates.map(template => (
                                        <button
                                            key={template.id}
                                            type="button"
                                            onClick={() => setSelectedSourceTemplate(template.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded text-left transition-colors",
                                                selectedSourceTemplate === template.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "hover:bg-accent"
                                            )}
                                        >
                                            <Layout size={16} />
                                            <span className="text-sm">{template.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info message for new from scratch */}
                        {!editingTemplate && creationMode === 'new' && (
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
                                    if (e.key === "Enter" && canSave) handleSave();
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
                                disabled={!canSave || !!processingId}
                            >
                                {processingId ? <Loader2 className="animate-spin mr-2" size={14} /> :
                                    creationMode === 'duplicate' ? <Copy className="mr-2" size={14} /> : <Save className="mr-2" size={14} />}
                                {editingTemplate ? "Actualizar Nombre" : (creationMode === 'duplicate' ? "Duplicar Plantilla" : "Guardar Plantilla")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
                        {/* Fallback list mode - not typically reached */}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
