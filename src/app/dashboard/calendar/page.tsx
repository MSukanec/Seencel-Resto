"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DayConfiguration, getMonthConfigurations, getOperatingSchedules, OperatingSchedule } from "@/lib/supabase/reservation-queries";
import { DayConfigDrawer, CalendarDayCell } from "@/features/calendar";
import { PageHeader } from "@/components/layout/PageHeader";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [dayConfigs, setDayConfigs] = useState<DayConfiguration[]>([]);
    const [schedules, setSchedules] = useState<OperatingSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const match = document.cookie.match(new RegExp('(^| )selected_restaurant_id=([^;]+)'));
        if (match) setRestaurantId(match[2]);
    }, []);

    useEffect(() => {
        if (restaurantId) fetchMonthData();
    }, [restaurantId, currentDate]);

    const fetchMonthData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);

        const [configsResult, schedulesResult] = await Promise.all([
            getMonthConfigurations(restaurantId, format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")),
            getOperatingSchedules(restaurantId)
        ]);

        if (configsResult.data) setDayConfigs(configsResult.data);
        if (schedulesResult.data) setSchedules(schedulesResult.data);
        setLoading(false);
    };

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const getConfigForDay = (day: Date) => {
        return dayConfigs.find(c => c.date === format(day, "yyyy-MM-dd"));
    };

    const getDayStatus = (day: Date) => {
        const config = getConfigForDay(day);
        if (config) {
            return {
                isSpecial: config.is_special_event,
                eventName: config.event_name,
                isClosed: config.is_closed
            };
        }

        const dayOfWeek = day.getDay();
        const schedule = schedules.find(s => s.day_of_week === dayOfWeek);

        return {
            isSpecial: false,
            eventName: null,
            isClosed: schedule ? schedule.is_closed : false
        };
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsDrawerOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <PageHeader
                icon={CalendarIcon}
                title="Calendario de Reservas"
                subtitle="Gestiona eventos y horarios especiales."
                actions={
                    <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-1 shadow-sm">
                        <button
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold w-32 text-center capitalize">
                            {format(currentDate, "MMMM yyyy", { locale: es })}
                        </span>
                        <button
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                }
            />

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-4 mb-4">
                            {WEEKDAYS.map((day) => (
                                <div key={day} className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-4 auto-rows-[140px]">
                            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {days.map((day) => (
                                <CalendarDayCell
                                    key={day.toISOString()}
                                    day={day}
                                    status={getDayStatus(day)}
                                    onClick={handleDayClick}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <DayConfigDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                date={selectedDate}
                restaurantId={restaurantId}
                initialConfig={selectedDate ? getConfigForDay(selectedDate) : undefined}
                onSave={fetchMonthData}
            />
        </div>
    );
}
