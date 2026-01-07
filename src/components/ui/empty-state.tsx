import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon: Icon,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px] border-2 border-dashed border-border/50 rounded-xl bg-card/50", className)}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 animate-in fade-in zoom-in duration-500">
                <Icon size={40} />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground max-w-sm mb-8 text-lg leading-relaxed">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    size="lg"
                    className="font-semibold px-8 hover:scale-105 transition-transform"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
