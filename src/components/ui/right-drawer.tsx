import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface RightDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export function RightDrawer({ isOpen, onClose, title, children, className }: RightDrawerProps) {
    const [visible, setVisible] = useState(isOpen);

    useEffect(() => {
        if (isOpen) setVisible(true);
        else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div
            className={cn(
                "fixed z-50 bg-card shadow-2xl transform transition-transform duration-300 ease-in-out",
                // Mobile: Bottom Sheet
                "inset-x-0 bottom-0 top-auto w-full rounded-t-xl border-t h-auto max-h-[85vh]",
                // Desktop: Floating Palette
                "md:inset-auto md:right-4 md:top-1/2 md:w-80 md:rounded-xl md:border",
                // State Transforms
                isOpen
                    ? "translate-y-0 md:translate-x-0 md:-translate-y-1/2"
                    : "translate-y-full md:translate-x-[110%] md:-translate-y-1/2",
                className
            )}
        >
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">{title || "Propiedades"}</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh] md:max-h-[80vh]">
                {children}
            </div>
        </div>
    );
}
