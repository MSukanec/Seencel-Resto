"use client";

import * as React from "react";
import { X, LucideIcon } from "lucide-react";

type DialogSize = "sm" | "md" | "lg" | "xl";

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    icon?: LucideIcon;
    size?: DialogSize;
    footer?: React.ReactNode;
}

import { createPortal } from "react-dom";

const sizeClasses: Record<DialogSize, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export function Dialog({ isOpen, onClose, children, title, icon: Icon, size = "md", footer }: DialogProps) {
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
                className={`relative w-full ${sizeClasses[size]} max-h-[90vh] transform overflow-hidden rounded-lg bg-background text-left align-middle shadow-2xl border border-border transition-all duration-300 flex flex-col ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
            >
                {/* Fixed Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                        <div className="flex items-center gap-3">
                            {Icon && (
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Icon size={18} className="text-primary" />
                                </div>
                            )}
                            <h3 className="text-lg font-semibold leading-6 text-foreground tracking-tight">
                                {title}
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Scrollable Body */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Fixed Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-border shrink-0 bg-background">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}



