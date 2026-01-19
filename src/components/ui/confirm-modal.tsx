"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// Context
const ConfirmContext = createContext<ConfirmContextType | null>(null);

// Hook
export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context.confirm;
}

// Provider Component
export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setOptions(opts);
            setResolveRef(() => resolve);
            setIsOpen(true);
        });
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        resolveRef?.(false);
        setResolveRef(null);
    }, [resolveRef]);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        resolveRef?.(true);
        setResolveRef(null);
    }, [resolveRef]);

    const Icon = options?.variant === 'danger'
        ? Trash2
        : options?.variant === 'warning'
            ? AlertTriangle
            : AlertCircle;

    const iconBg = options?.variant === 'danger'
        ? "bg-destructive/10 text-destructive"
        : options?.variant === 'warning'
            ? "bg-amber-500/10 text-amber-500"
            : "bg-primary/10 text-primary";

    const confirmBtnClass = options?.variant === 'danger'
        ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        : options?.variant === 'warning'
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-primary text-primary-foreground hover:opacity-90";

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <Dialog isOpen={isOpen} onClose={handleClose} title={options?.title || "Confirmar"}>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-full", iconBg)}>
                            <Icon size={24} />
                        </div>
                        <p className="text-sm text-muted-foreground pt-2 flex-1">
                            {options?.message}
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {options?.cancelText || "Cancelar"}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all", confirmBtnClass)}
                        >
                            {options?.confirmText || "Confirmar"}
                        </button>
                    </div>
                </div>
            </Dialog>
        </ConfirmContext.Provider>
    );
}
