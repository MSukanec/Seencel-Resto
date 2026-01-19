"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    Users,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Check,
    User,
    Phone
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrderContext } from "../layout";
import { cn } from "@/lib/utils";

const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS = ["D", "L", "M", "M", "J", "V", "S"];

export default function ReservationPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const restaurantId = params.restaurantId as string;
    const { restaurant } = useOrderContext();

    const isEventMode = searchParams.get("type") === "event";

    // Check if user is logged in
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [step, setStep] = useState<"date" | "time" | "guests" | "contact" | "confirm">("date");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [guests, setGuests] = useState(2);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Contact info for non-logged-in users
    const [contactName, setContactName] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
        setCheckingAuth(false);
    };

    // Generate calendar days
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Empty cells for days before month starts
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }

        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const isDateDisabled = (date: Date | null) => {
        if (!date) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isSameDay = (date1: Date | null, date2: Date | null) => {
        if (!date1 || !date2) return false;
        return date1.toDateString() === date2.toDateString();
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        return date.toDateString() === new Date().toDateString();
    };

    // Available time slots (placeholder)
    const timeSlots = [
        "12:00", "12:30", "13:00", "13:30", "14:00",
        "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
    ];

    const getNextStep = () => {
        if (step === "guests") {
            return isLoggedIn ? "confirm" : "contact";
        }
        return step === "date" ? "time" : step === "time" ? "guests" : step === "contact" ? "confirm" : "confirm";
    };

    const getPrevStep = () => {
        if (step === "confirm") {
            return isLoggedIn ? "guests" : "contact";
        }
        return step === "contact" ? "guests" : step === "guests" ? "time" : step === "time" ? "date" : "date";
    };

    const handleConfirm = () => {
        // TODO: Send reservation to backend
        alert("¡Reserva confirmada! (Esta es una demo)");
        router.push(`/order/${restaurantId}/info`);
    };

    const canProceedFromContact = contactName.trim().length > 0 && contactPhone.trim().length >= 8;

    return (
        <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (step === "date") {
                                router.back();
                            } else {
                                setStep(getPrevStep() as typeof step);
                            }
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="font-bold text-white">
                            {isEventMode ? "Eventos Especiales" : "Reservar Mesa"}
                        </h1>
                        <p className="text-xs text-white/40">{restaurant?.name}</p>
                    </div>
                </div>
            </header>

            {/* Progress */}
            <div className="px-6 py-3">
                <div className="flex items-center gap-1">
                    {(isLoggedIn ? ["date", "time", "guests", "confirm"] : ["date", "time", "guests", "contact", "confirm"]).map((s, i, arr) => (
                        <div key={s} className="flex-1">
                            <div className={cn(
                                "h-1 rounded-full transition-colors",
                                arr.indexOf(step) >= i
                                    ? "bg-[#f05526]"
                                    : "bg-white/20"
                            )} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Date Selection */}
                {step === "date" && (
                    <div className="px-6 pb-6">
                        {isEventMode && (
                            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                                <div className="flex items-center gap-3">
                                    <Sparkles size={20} className="text-purple-400" />
                                    <div>
                                        <div className="font-semibold text-white text-sm">Próximos Eventos</div>
                                        <div className="text-xs text-white/50">No hay eventos programados</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                            {/* Month navigation */}
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="font-semibold text-white text-sm">
                                    {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <button
                                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {DAYS.map((day, i) => (
                                    <div key={i} className="text-center text-[10px] text-white/40 py-1 font-medium">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {generateCalendarDays().map((date, i) => (
                                    <button
                                        key={i}
                                        disabled={isDateDisabled(date)}
                                        onClick={() => date && setSelectedDate(date)}
                                        className={cn(
                                            "aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                                            !date && "invisible",
                                            date && isDateDisabled(date) && "text-white/20 cursor-not-allowed",
                                            date && !isDateDisabled(date) && !isSameDay(date, selectedDate) && "text-white/70 hover:bg-white/10",
                                            date && isSameDay(date, selectedDate) && "bg-[#f05526] text-white font-bold",
                                            date && isToday(date) && !isSameDay(date, selectedDate) && "ring-1 ring-[#f05526]/50"
                                        )}
                                    >
                                        {date?.getDate()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedDate && (
                            <button
                                onClick={() => setStep("time")}
                                className="w-full mt-4 py-3.5 bg-[#f05526] text-white font-bold rounded-xl hover:bg-[#f05526]/90 transition-colors"
                            >
                                Continuar
                            </button>
                        )}
                    </div>
                )}

                {/* Time Selection */}
                {step === "time" && (
                    <div className="px-6 pb-6">
                        <div className="mb-3 flex items-center gap-2 text-white/60">
                            <CalendarDays size={16} />
                            <span className="text-sm">
                                {selectedDate?.toLocaleDateString("es-AR", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long"
                                })}
                            </span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-3">Elegí un horario</h3>

                        <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={cn(
                                        "py-2.5 rounded-lg text-sm font-medium transition-all border",
                                        selectedTime === time
                                            ? "bg-[#f05526] text-white border-[#f05526]"
                                            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>

                        {selectedTime && (
                            <button
                                onClick={() => setStep("guests")}
                                className="w-full mt-4 py-3.5 bg-[#f05526] text-white font-bold rounded-xl hover:bg-[#f05526]/90 transition-colors"
                            >
                                Continuar
                            </button>
                        )}
                    </div>
                )}

                {/* Guests Selection */}
                {step === "guests" && (
                    <div className="px-6 pb-6">
                        <div className="mb-3 flex items-center gap-3 text-white/60">
                            <div className="flex items-center gap-1.5">
                                <CalendarDays size={14} />
                                <span className="text-xs">
                                    {selectedDate?.toLocaleDateString("es-AR", {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short"
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} />
                                <span className="text-xs">{selectedTime}</span>
                            </div>
                        </div>

                        <h3 className="text-base font-bold text-white mb-4">¿Cuántas personas?</h3>

                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={() => setGuests(Math.max(1, guests - 1))}
                                disabled={guests <= 1}
                                className="w-12 h-12 rounded-full bg-white/10 text-white text-xl font-bold disabled:opacity-30"
                            >
                                -
                            </button>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-bold text-white">{guests}</span>
                                <span className="text-white/40 text-xs">personas</span>
                            </div>
                            <button
                                onClick={() => setGuests(Math.min(20, guests + 1))}
                                disabled={guests >= 20}
                                className="w-12 h-12 rounded-full bg-white/10 text-white text-xl font-bold disabled:opacity-30"
                            >
                                +
                            </button>
                        </div>

                        <button
                            onClick={() => setStep(getNextStep() as typeof step)}
                            className="w-full mt-6 py-3.5 bg-[#f05526] text-white font-bold rounded-xl hover:bg-[#f05526]/90 transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Contact Info (only for non-logged-in users) */}
                {step === "contact" && !isLoggedIn && (
                    <div className="px-6 pb-6">
                        <h3 className="text-base font-bold text-white mb-4">Tus datos de contacto</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Nombre y Apellido</label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#f05526]/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Teléfono</label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="+54 9 11 1234-5678"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#f05526]/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep("confirm")}
                            disabled={!canProceedFromContact}
                            className="w-full mt-6 py-3.5 bg-[#f05526] text-white font-bold rounded-xl hover:bg-[#f05526]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Confirmation */}
                {step === "confirm" && (
                    <div className="px-6 pb-6">
                        <h3 className="text-base font-bold text-white mb-4">Confirmá tu reserva</h3>

                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <CalendarDays size={18} className="text-white/60" />
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">
                                        {selectedDate?.toLocaleDateString("es-AR", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long"
                                        })}
                                    </div>
                                    <div className="text-white/40 text-xs">Fecha</div>
                                </div>
                            </div>

                            <div className="border-t border-white/10" />

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Clock size={18} className="text-white/60" />
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{selectedTime}</div>
                                    <div className="text-white/40 text-xs">Horario</div>
                                </div>
                            </div>

                            <div className="border-t border-white/10" />

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Users size={18} className="text-white/60" />
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{guests} personas</div>
                                    <div className="text-white/40 text-xs">Comensales</div>
                                </div>
                            </div>

                            {!isLoggedIn && contactName && (
                                <>
                                    <div className="border-t border-white/10" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                            <User size={18} className="text-white/60" />
                                        </div>
                                        <div>
                                            <div className="text-white font-medium text-sm">{contactName}</div>
                                            <div className="text-white/40 text-xs">{contactPhone}</div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleConfirm}
                            className="w-full mt-4 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            Confirmar Reserva
                        </button>

                        <p className="text-center text-xs text-white/30 mt-3">
                            Te enviaremos un recordatorio antes de tu reserva
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 text-center text-xs text-white/20 border-t border-white/5">
                Powered by <span className="font-semibold text-white/40">Seencel<span className="text-white/60">Resto</span></span>
            </div>
        </div>
    );
}
