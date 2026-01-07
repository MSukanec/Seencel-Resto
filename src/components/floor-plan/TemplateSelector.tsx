"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutTemplate } from "@/lib/supabase/template-queries";


interface TemplateSelectorProps {
    templates: LayoutTemplate[];
    selectedTemplateId?: string | null;
    onSelect: (templateId: string) => void;
    onCreate: () => void;
}

export function TemplateSelector({ templates, selectedTemplateId, onSelect, onCreate }: TemplateSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div className="flex items-center gap-2" ref={containerRef}>
            <div className="relative">
                {/* Trigger */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium shadow-sm transition-all hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <div className="flex items-center gap-2">
                        <FolderOpen size={16} className="text-primary" />
                        <span className="truncate max-w-[120px]">
                            {templates.length === 0 ? "Sin plantillas" : selectedTemplate ? selectedTemplate.name : "Seleccionar..."}
                        </span>
                    </div>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                </button>

                {/* Dropdown Popover */}
                {isOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[200px] animate-in fade-in zoom-in-95 duration-100 rounded-xl border border-border bg-popover p-1 shadow-lg shadow-black/5">
                        <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                            {templates.length === 0 && (
                                <div className="px-2 py-2 text-sm text-muted-foreground text-center">
                                    No hay plantillas guardadas
                                </div>
                            )}

                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => {
                                        onSelect(template.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                        selectedTemplateId === template.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                                    )}
                                >
                                    <span>{template.name}</span>
                                    {selectedTemplateId === template.id && <Check size={14} className="text-primary" />}
                                </button>
                            ))}
                        </div>

                        <div className="my-1 h-px bg-border/50" />
                        <button
                            onClick={() => {
                                onCreate();
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                            <Plus size={14} />
                            Nueva Plantilla...
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

}
