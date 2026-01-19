"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Minus, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Escribe aquí...", minHeight = "200px" }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        // Trigger onChange after command
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const ToolbarButton = ({ icon: Icon, command, active, title }: { icon: any; command: string; active?: boolean; title: string }) => (
        <button
            type="button"
            onClick={() => execCommand(command)}
            className={cn(
                "p-2 rounded-lg transition-colors",
                active ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title={title}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-input">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
                <ToolbarButton icon={Bold} command="bold" title="Negrita" />
                <ToolbarButton icon={Italic} command="italic" title="Cursiva" />
                <div className="w-px h-5 bg-border mx-1" />
                <ToolbarButton icon={Heading2} command="formatBlock" title="Título" />
                <ToolbarButton icon={Heading3} command="formatBlock" title="Subtítulo" />
                <div className="w-px h-5 bg-border mx-1" />
                <ToolbarButton icon={List} command="insertUnorderedList" title="Lista" />
                <ToolbarButton icon={ListOrdered} command="insertOrderedList" title="Lista numerada" />
                <div className="w-px h-5 bg-border mx-1" />
                <ToolbarButton icon={Quote} command="formatBlock" title="Cita" />
                <ToolbarButton icon={Minus} command="insertHorizontalRule" title="Línea separadora" />
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="p-4 outline-none prose prose-sm max-w-none"
                style={{ minHeight }}
                onInput={handleInput}
                onBlur={handleInput}
                dangerouslySetInnerHTML={{ __html: value }}
                data-placeholder={placeholder}
            />

            <style jsx>{`
                [data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #9ca3af;
                    pointer-events: none;
                }
            `}</style>
        </div>
    );
}
