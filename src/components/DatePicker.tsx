"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ value, onChange, label, placeholder, className }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Current view state
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const monthNames = [
        "Jänner", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];

    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    const formatDateGerman = (dateStr: string) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-");
        return `${d}.${m}.${y}`;
    };

    // Calculate days for the calendar grid
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    let startDay = firstDayOfMonth(year, month);
    // Adjust for Monday start (JS default is Sunday=0)
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    // Padding for previous month
    for (let i = 0; i < startDay; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
        days.push(i);
    }

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {label && <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl cursor-pointer flex items-center justify-between transition-all hover:border-indigo-400 group",
                    isOpen && "ring-2 ring-indigo-500/20 border-indigo-500"
                )}
            >
                <div className="flex items-center gap-4">
                    <CalendarIcon className={cn("h-5 w-5", value ? "text-indigo-600" : "text-slate-400")} />
                    <span className={cn("font-medium", !value && "text-slate-400")}>
                        {value ? formatDateGerman(value) : (placeholder || "Datum wählen")}
                    </span>
                </div>
                {value && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange("");
                        }}
                        className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute left-0 mt-3 w-[340px] bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">
                            {monthNames[month]} {year}
                        </h4>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {weekDays.map(d => (
                            <div key={d} className="h-10 flex items-center justify-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}
                        {days.map((day, i) => {
                            const isCurrentDate = value &&
                                viewDate.getFullYear() === new Date(value).getFullYear() &&
                                viewDate.getMonth() === new Date(value).getMonth() &&
                                day === new Date(value).getDate();

                            const isToday = !isCurrentDate &&
                                viewDate.getFullYear() === new Date().getFullYear() &&
                                viewDate.getMonth() === new Date().getMonth() &&
                                day === new Date().getDate();

                            return (
                                <div key={i} className="h-10 flex items-center justify-center">
                                    {day ? (
                                        <button
                                            onClick={() => handleDateSelect(day)}
                                            className={cn(
                                                "h-10 w-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center",
                                                isCurrentDate
                                                    ? "bg-primary-gradient text-white shadow-lg shadow-indigo-500/30 scale-105"
                                                    : isToday
                                                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between">
                        <button
                            onClick={() => {
                                setViewDate(new Date());
                                handleDateSelect(new Date().getDate());
                            }}
                            className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-widest"
                        >
                            Heute
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                        >
                            Schließen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
