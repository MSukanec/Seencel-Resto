"use client";

import { format, isSameDay } from "date-fns";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayStatus {
    isSpecial: boolean;
    eventName: string | null;
    isClosed: boolean;
}

interface CalendarDayCellProps {
    day: Date;
    status: DayStatus;
    onClick: (day: Date) => void;
}

export function CalendarDayCell({ day, status, onClick }: CalendarDayCellProps) {
    const { isSpecial, eventName, isClosed } = status;
    const isToday = isSameDay(day, new Date());

    return (
        <button
            onClick={() => onClick(day)}
            className={cn(
                "relative flex flex-col items-start justify-between p-4 rounded-2xl border transition-all text-left group hover:-translate-y-1 hover:shadow-md",
                isToday ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card",
                isClosed && "bg-muted/50 opacity-70",
                isSpecial && "border-amber-400/50 bg-amber-50/10"
            )}
        >
            <span className={cn(
                "text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full",
                isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:bg-muted"
            )}>
                {format(day, "d")}
            </span>

            {/* Event Indicators */}
            <div className="w-full space-y-1">
                {isSpecial && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md truncate w-full border border-amber-200">
                        <Star size={10} fill="currentColor" />
                        <span className="truncate">{eventName || "Evento"}</span>
                    </div>
                )}
                {isClosed && (
                    <div className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md text-center border border-border/50">
                        Cerrado
                    </div>
                )}
                {!isSpecial && !isClosed && (
                    <div className="h-6" /> // Spacer
                )}
            </div>
        </button>
    );
}
