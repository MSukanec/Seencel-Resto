"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
    onFileLoaded: (data: string[][]) => void;
    accept?: string;
    maxSizeMB?: number;
    className?: string;
}

export function DropZone({
    onFileLoaded,
    accept = ".xlsx,.xls,.csv",
    maxSizeMB = 5,
    className
}: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const parseFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setFileName(file.name);

        try {
            // Check file size
            if (file.size > maxSizeMB * 1024 * 1024) {
                throw new Error(`El archivo excede el límite de ${maxSizeMB}MB`);
            }

            const extension = file.name.split('.').pop()?.toLowerCase();

            if (extension === 'csv') {
                // Parse CSV
                const text = await file.text();
                const rows = text.trim().split('\n').map(line => {
                    // Handle quoted CSV values
                    const result: string[] = [];
                    let current = '';
                    let inQuotes = false;

                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result;
                });
                onFileLoaded(rows);
            } else if (extension === 'xlsx' || extension === 'xls') {
                // Dynamic import SheetJS for Excel parsing
                const XLSX = await import('xlsx');
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 });
                onFileLoaded(data as string[][]);
            } else {
                throw new Error('Formato no soportado. Usa .xlsx, .xls o .csv');
            }
        } catch (err: any) {
            setError(err.message || 'Error al procesar el archivo');
            setFileName(null);
        } finally {
            setIsLoading(false);
        }
    }, [maxSizeMB, onFileLoaded]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleClear = useCallback(() => {
        setFileName(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = '';
    }, []);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
                "relative border-2 border-dashed rounded-xl transition-all duration-200",
                isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50",
                fileName && !error && "border-green-500 bg-green-50",
                error && "border-destructive bg-destructive/5",
                className
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center p-8 text-center pointer-events-none">
                {isLoading ? (
                    <>
                        <Loader2 size={48} className="text-primary animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">Procesando archivo...</p>
                    </>
                ) : fileName && !error ? (
                    <>
                        <FileSpreadsheet size={48} className="text-green-600 mb-4" />
                        <p className="text-sm font-medium text-green-700">{fileName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Archivo cargado correctamente</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                            className="mt-3 text-xs text-destructive hover:underline pointer-events-auto flex items-center gap-1"
                        >
                            <X size={12} /> Limpiar
                        </button>
                    </>
                ) : error ? (
                    <>
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <X size={24} className="text-destructive" />
                        </div>
                        <p className="text-sm font-medium text-destructive">{error}</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                            className="mt-3 text-xs text-primary hover:underline pointer-events-auto"
                        >
                            Intentar de nuevo
                        </button>
                    </>
                ) : (
                    <>
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
                            isDragging ? "bg-primary/20" : "bg-muted"
                        )}>
                            <Upload size={28} className={isDragging ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <p className="text-sm font-medium">
                            {isDragging ? "Suelta el archivo aquí" : "Arrastra tu archivo Excel o CSV"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            o haz clic para seleccionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                            Formatos: .xlsx, .xls, .csv • Máx {maxSizeMB}MB
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
