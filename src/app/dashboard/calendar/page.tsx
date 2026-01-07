"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DayConfiguration, getMonthConfigurations, upsertDayConfiguration, getOperatingSchedules, OperatingSchedule } from "@/lib/supabase/reservation-queries";
// ... imports ...

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [dayConfigs, setDayConfigs] = useState<DayConfiguration[]>([]);
    const [schedules, setSchedules] = useState<OperatingSchedule[]>([]); // New state
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // ... existing load ...

    const fetchMonthData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        // Parallel Fetch
        const [configsResult, schedulesResult] = await Promise.all([
            getMonthConfigurations(restaurantId, format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")),
            getOperatingSchedules(restaurantId)
        ]);

        if (configsResult.data) setDayConfigs(configsResult.data);
        if (schedulesResult.data) setSchedules(schedulesResult.data);

        setLoading(false);
    };

    // ... existing ...

    // Helper to determine status
    const getDayStatus = (day: Date) => {
        const config = getConfigForDay(day);

        // 1. Specific Configuration Override
        if (config) {
            return {
                isSpecial: config.is_special_event,
                eventName: config.event_name,
                isClosed: config.is_closed
            };
        }

        // 2. Regular Schedule Check
        const dayOfWeek = day.getDay(); // 0 = Sunday
        const schedule = schedules.find(s => s.day_of_week === dayOfWeek);

        // If we have a schedule, check if closed. If NO schedule, assume Open (or Closed? Default to Open for safety unless explicit).
        // Let's assume if schedule exists, we respect it. If not, default to OPEN (or Closed if we wanted strict).
        // Given we init the settings with all open, assuming OPEN is safe? Or maybe default CLOSED to force config?
        // User asked to "choose days they OPEN".
        // If s is undefined, it means no config saved yet.

        return {
            isSpecial: false,
            eventName: null,
            isClosed: schedule ? schedule.is_closed : false
        };
    };

    return (
        // ... existing JSX ...
        <div className="grid grid-cols-7 gap-2">
            {
                days.map((day) => {
                    const { isSpecial, eventName, isClosed } = getDayStatus(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => handleDayClick(day)}
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
                })}
        </div>

            {/* Config Drawer */ }
    <DayConfigDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        date={selectedDate}
        restaurantId={restaurantId}
        initialConfig={selectedDate ? getConfigForDay(selectedDate) : undefined}
        onSave={handleConfigSave}
    />
        </div >
    );
}
