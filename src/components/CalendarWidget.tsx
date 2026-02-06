"use client";

import React, { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Trash2,
    CalendarDays,
    LayoutGrid,
    Search,
    Maximize2,
    Minimize2,
    ChevronUp,
    ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent } from '@/types/calendar';
import { EventModal } from '@/components/EventModal';

type ViewType = 'month' | 'week' | 'day';

export function CalendarWidget() {
    const { events, deleteEvent, isLoading } = useCalendarEvents();
    const [viewType, setViewType] = useState<ViewType>('week');
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
    const [selectedHour, setSelectedHour] = useState<string | undefined>(undefined);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const monthNames = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];

    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const hours = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0') + ":00");

    // Helper: Start of week (Monday)
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const handleToday = () => {
        const today = new Date();
        setViewDate(today);
        setSelectedDate(today);
    };

    const handlePrev = () => {
        if (viewType === 'month') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        } else if (viewType === 'week') {
            setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 7)));
        } else {
            setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)));
            setSelectedDate(new Date(viewDate));
        }
    };

    const handleNext = () => {
        if (viewType === 'month') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        } else if (viewType === 'week') {
            setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 7)));
        } else {
            setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)));
            setSelectedDate(new Date(viewDate));
        }
    };

    const handleAddEvent = (date?: string, hour?: string) => {
        if (date) setSelectedDate(new Date(date));
        setEditingEvent(undefined);
        setSelectedHour(hour);
        setIsModalOpen(true);
    };

    const handleEditEvent = (event: CalendarEvent) => {
        setEditingEvent(event);
        setSelectedHour(undefined);
        setIsModalOpen(true);
    };

    // --- RENDER HELPERS ---

    const renderMonthView = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
        const firstDay = (y: number, m: number) => {
            const d = new Date(y, m, 1).getDay();
            return d === 0 ? 6 : d - 1;
        };

        const totalDays = daysInMonth(year, month);
        const startDayPad = firstDay(year, month);
        const calendarDays = [];
        for (let i = 0; i < startDayPad; i++) calendarDays.push(null);
        for (let i = 1; i <= totalDays; i++) calendarDays.push(i);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-7 gap-4">
                    {weekDays.map(d => (
                        <div key={d} className="h-8 flex items-center justify-center text-[11px] font-black text-slate-600 uppercase tracking-widest">
                            {d}
                        </div>
                    ))}
                    {calendarDays.map((day, i) => {
                        if (!day) return <div key={`pad-${i}`} />;
                        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        const dailyEvents = events.filter(e => e.date === dStr);

                        return (
                            <div
                                key={day}
                                onClick={() => { setSelectedDate(new Date(year, month, day)); setViewType('day'); setViewDate(new Date(year, month, day)); }}
                                className={cn(
                                    "min-h-[140px] p-4 bg-white border border-slate-100 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 cursor-pointer group flex flex-col gap-2",
                                    isToday && "ring-2 ring-indigo-500 ring-offset-4 ring-offset-white"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={cn("text-lg font-black", isToday ? "text-indigo-600" : "text-slate-900")}>
                                        {day}
                                    </span>
                                    {dailyEvents.length > 0 && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                    )}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                    {dailyEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "px-2 py-1 rounded-lg text-[10px] font-bold truncate",
                                                event.type === 'important' ? "bg-rose-50 text-rose-600" :
                                                    event.type === 'work' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                            )}
                                        >
                                            {event.startTime && `${event.startTime} `}{event.title}
                                        </div>
                                    ))}
                                    {dailyEvents.length > 3 && (
                                        <div className="text-[10px] font-black text-slate-400 pl-1">
                                            +{dailyEvents.length - 3} weitere
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const startOfWeek = getStartOfWeek(viewDate);
        const weekDaysToRender = [0, 1, 2, 3, 4]; // Mo - Fr (requested)

        return (
            <div className="grid grid-cols-6 gap-0 border border-slate-100 rounded-[2.5rem] bg-white overflow-hidden">
                {/* Time Axis Column */}
                <div className="border-r border-slate-100 bg-slate-50/50">
                    <div className="h-20 border-b border-slate-100 flex items-center justify-center p-4">
                        <Clock className="h-5 w-5 text-slate-400" />
                    </div>
                    {hours.map(hour => (
                        <div key={hour} className="h-[80px] flex items-start justify-end pr-4 pt-2">
                            <span className="text-[11px] font-black text-slate-600 tabular-nums">{hour}</span>
                        </div>
                    ))}
                </div>

                {/* Day Columns */}
                {weekDaysToRender.map(idx => {
                    const current = new Date(startOfWeek);
                    current.setDate(startOfWeek.getDate() + idx);
                    const dateStr = current.toISOString().split('T')[0];
                    const isToday = new Date().toDateString() === current.toDateString();

                    return (
                        <div key={idx} className={cn("flex-1", idx < 4 ? "border-r border-slate-100" : "")}>
                            <div className={cn(
                                "h-20 border-b border-slate-100 flex flex-col items-center justify-center p-4 transition-colors",
                                isToday ? "bg-indigo-50/30" : "bg-white"
                            )}>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">{weekDays[idx]}</span>
                                <span className={cn("text-xl font-black", isToday ? "text-indigo-600" : "text-slate-900")}>
                                    {current.getDate()}
                                </span>
                            </div>
                            <div className="relative">
                                {hours.map(hour => (
                                    <div
                                        key={hour}
                                        className="h-[80px] border-b border-slate-100/50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        onClick={() => handleAddEvent(dateStr, hour)}
                                    />
                                ))}

                                {/* Absolute events Layer */}
                                {events.filter(e => e.date === dateStr).map(event => {
                                    if (!event.startTime) return null;
                                    const hourPart = parseInt(event.startTime.split(':')[0]);
                                    const minPart = parseInt(event.startTime.split(':')[1]);
                                    const top = (hourPart - 6) * 80 + (minPart / 60) * 80;

                                    // Calculate duration for height
                                    let height = 60; // default 45 mins
                                    if (event.endTime) {
                                        const endH = parseInt(event.endTime.split(':')[0]);
                                        const endM = parseInt(event.endTime.split(':')[1]);
                                        const durationMins = (endH * 60 + endM) - (hourPart * 60 + minPart);
                                        height = (durationMins / 60) * 80;
                                    }

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            className={cn(
                                                "absolute inset-x-2 rounded-2xl p-3 shadow-lg border-l-4 transition-all hover:scale-[1.02] cursor-pointer z-10 overflow-hidden",
                                                event.type === 'important' ? "bg-rose-50/90 border-rose-500 text-rose-900" :
                                                    event.type === 'work' ? "bg-indigo-50/90 border-indigo-500 text-indigo-900" : "bg-emerald-50/90 border-emerald-500 text-emerald-900"
                                            )}
                                        >
                                            <p className="text-xs font-black truncate">{event.title}</p>
                                            <p className="text-[10px] font-bold opacity-60">
                                                {event.startTime}{event.endTime && ` - ${event.endTime}`}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const isToday = new Date().toDateString() === selectedDate.toDateString();

        return (
            <div className="max-w-4xl mx-auto border border-slate-100 rounded-[2.5rem] bg-white overflow-hidden">
                <div className="h-20 border-b border-slate-100 flex items-center justify-between px-10 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <span className={cn("text-3xl font-black", isToday ? "text-indigo-600" : "text-slate-900")}>
                            {selectedDate.getDate()}.
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                {weekDays[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]}
                            </span>
                            <span className="text-sm font-bold text-slate-600">
                                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="p-10 space-y-2">
                    {hours.map(hour => {
                        const eventAtHour = events.find(e => e.date === dateStr && e.startTime?.startsWith(hour.split(':')[0]));
                        return (
                            <div key={hour} className="flex gap-10 group">
                                <span className="w-16 pt-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest tabular-nums group-hover:text-indigo-500 transition-colors">
                                    {hour}
                                </span>
                                <div
                                    className={cn(
                                        "flex-1 min-h-[80px] rounded-3xl border border-transparent transition-all relative flex flex-col justify-center px-8",
                                        eventAtHour
                                            ? (eventAtHour.type === 'important' ? 'bg-rose-50 border-rose-100' :
                                                eventAtHour.type === 'work' ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100')
                                            : 'hover:bg-slate-50 hover:border-slate-100 cursor-pointer'
                                    )}
                                    onClick={() => eventAtHour ? handleEditEvent(eventAtHour) : handleAddEvent(dateStr, hour)}
                                >
                                    {eventAtHour ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={cn(
                                                    "text-lg font-black leading-tight",
                                                    eventAtHour.type === 'important' ? 'text-rose-900' :
                                                        eventAtHour.type === 'work' ? 'text-indigo-900' : 'text-emerald-900'
                                                )}>
                                                    {eventAtHour.title}
                                                </p>
                                                <p className="text-sm font-bold opacity-60">
                                                    {eventAtHour.startTime} {eventAtHour.endTime && `- ${eventAtHour.endTime}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteEvent(eventAtHour.id); }}
                                                className="p-3 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Termin am {hour} hinzufügen
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "glass-card p-12 space-y-12 group transition-all duration-500 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-700",
            isFullscreen ? "fixed inset-0 z-[100] bg-white rounded-none border-0 overflow-y-auto" : "hover:border-indigo-500/30",
            isMinimized && !isFullscreen && "p-8 space-y-0"
        )}>
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-[1.75rem] bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10 border border-indigo-100/50">
                        <CalendarIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Terminkalender</h3>
                        <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {viewType === 'month' ? `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}` :
                                viewType === 'week' ? `Woche ${Math.ceil(viewDate.getDate() / 7)}, ${monthNames[viewDate.getMonth()]}` :
                                    selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* View Controls (Minimize/Fullscreen) */}
                    <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            title={isMinimized ? "Maximieren" : "Minimieren"}
                            className="p-2.5 hover:bg-white hover:shadow-md rounded-[1rem] transition-all text-slate-600"
                        >
                            {isMinimized ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Fenster verlassen" : "Vollbild"}
                            className="p-2.5 hover:bg-white hover:shadow-md rounded-[1rem] transition-all text-slate-600"
                        >
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </button>
                    </div>

                    {!isMinimized || isFullscreen ? (
                        <>
                            {/* Navigation */}
                            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button onClick={handlePrev} className="p-2.5 hover:bg-white hover:shadow-md rounded-[1rem] transition-all text-slate-600">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleToday}
                                    className="px-6 py-2 text-xs font-black text-slate-900 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                >
                                    Heute
                                </button>
                                <button onClick={handleNext} className="p-2.5 hover:bg-white hover:shadow-md rounded-[1rem] transition-all text-slate-600">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>

                            {/* View Switcher */}
                            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                {[
                                    { id: 'month', label: 'Monat', icon: LayoutGrid },
                                    { id: 'week', label: 'Woche', icon: CalendarDays },
                                    { id: 'day', label: 'Tag', icon: Clock },
                                ].map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setViewType(v.id as ViewType)}
                                        className={cn(
                                            "px-6 py-2.5 rounded-[1rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                                            viewType === v.id
                                                ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10 border border-indigo-100"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <v.icon className="h-3.5 w-3.5" />
                                        {v.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => handleAddEvent()}
                                className="h-14 px-8 bg-primary-gradient text-white rounded-[1.25rem] flex items-center gap-3 font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-500/20 hover:scale-[1.05] active:scale-95 transition-all"
                            >
                                <Plus className="h-5 w-5" /> Neuer Termin
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* Calendar Content */}
            {(!isMinimized || isFullscreen) && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-[3rem]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">Laden...</span>
                            </div>
                        </div>
                    )}

                    {viewType === 'month' && renderMonthView()}
                    {viewType === 'week' && renderWeekView()}
                    {viewType === 'day' && renderDayView()}
                </div>
            )}

            {isModalOpen && (
                <EventModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedHour(undefined);
                    }}
                    initialDate={selectedDate.toISOString().split('T')[0]}
                    initialStartTime={selectedHour}
                    editingEvent={editingEvent}
                />
            )}
        </div>
    );
}
