"use client";

import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

import { createPortal } from "react-dom";

export function Dialog({ isOpen, onClose, children, title }: DialogProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = "hidden";
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = "unset";
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted) return null;
    if (!isVisible && !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 text-foreground">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/5 backdrop-blur-md transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Content */}
            <div
                className={`relative w-full max-w-lg transform overflow-hidden rounded-lg bg-background p-6 text-left align-middle shadow-2xl border border-border transition-all duration-300 ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
            >
                {title && (
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-xl font-semibold leading-6 text-foreground tracking-tight">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {children}
            </div>
        </div>,
        document.body
    );
}
