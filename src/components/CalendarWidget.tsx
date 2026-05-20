"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Maximize2,
    LayoutGrid,
    CalendarDays,
    List,
    AlertCircle,
    MapPin,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { CalendarEvent } from '@/types/calendar';
import { EventModal } from '@/components/EventModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { isAustrianHoliday } from '@/lib/holidays';

type ViewType = 'month' | 'week' | 'day';

export function CalendarWidget({ isCompact = false }: { isCompact?: boolean }) {
    const { events, addEvent, updateEvent, deleteEvent, isLoading } = useCalendarEvents();
    const { data: companySettings } = useCompanySettings();

    const [viewType, setViewType] = useState<ViewType>(isCompact ? 'day' : 'week');
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);
    const [selectedHour, setSelectedHour] = useState<string | undefined>(undefined);
    
    // UI States
    const [isFullscreen, setIsFullscreen] = useState(false);

    const monthNames = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];
    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const hours = Array.from({ length: 14 }, (_, i) => String(i + 7).padStart(2, '0') + ":00");

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
        const d = new Date(viewDate);
        if (viewType === 'month') d.setMonth(d.getMonth() - 1);
        else if (viewType === 'week') d.setDate(d.getDate() - 7);
        else d.setDate(d.getDate() - 1);
        setViewDate(d);
        if (viewType === 'day') setSelectedDate(new Date(d));
    };

    const handleNext = () => {
        const d = new Date(viewDate);
        if (viewType === 'month') d.setMonth(d.getMonth() + 1);
        else if (viewType === 'week') d.setDate(d.getDate() + 7);
        else d.setDate(d.getDate() + 1);
        setViewDate(d);
        if (viewType === 'day') setSelectedDate(new Date(d));
    };

    const handleAddEvent = (date?: string, startHour?: string) => {
        if (date) setSelectedDate(new Date(date));
        setEditingEvent(undefined);
        setSelectedHour(startHour);
        setIsModalOpen(true);
    };

    // ─── Month View ──────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startPad = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const days = [];
        for (let i = 0; i < startPad; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        return (
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {weekDays.map(d => (
                    <div key={d} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                ))}
                {days.map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} className="bg-slate-50/50 min-h-[120px]" />;
                    
                    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    const holiday = isAustrianHoliday(dStr, companySettings?.state);
                    const dailyEvents = events.filter(e => e.startDate === dStr);

                    return (
                        <div 
                            key={day} 
                            onClick={() => { setSelectedDate(new Date(year, month, day)); setViewType('day'); setViewDate(new Date(year, month, day)); }}
                            className={cn(
                                "bg-white min-h-[120px] p-2 transition-all hover:bg-slate-50 group cursor-pointer flex flex-col gap-1",
                                isToday && "bg-indigo-50/30",
                                holiday && "bg-purple-50/20"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors",
                                    isToday ? "bg-indigo-600 text-white" : "text-slate-600 group-hover:text-indigo-600"
                                )}>
                                    {day}
                                </span>
                                {holiday && <span className="text-[8px] font-black text-purple-500 uppercase text-right leading-tight max-w-[60px]">{holiday.name}</span>}
                            </div>
                            <div className="flex-1 space-y-1 mt-1 overflow-hidden">
                                {dailyEvents.slice(0, 3).map(e => (
                                    <div key={e.id} className={cn(
                                        "px-2 py-0.5 rounded-md text-[9px] font-bold truncate border shadow-sm",
                                        e.type === 'important' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                                    )}>
                                        {e.startTime && <span className="opacity-60 mr-1">{e.startTime}</span>}
                                        {e.title}
                                    </div>
                                ))}
                                {dailyEvents.length > 3 && (
                                    <div className="text-[9px] font-bold text-slate-400 pl-1">+{dailyEvents.length - 3} weitere</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─── Week View ───────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const startOfWeek = getStartOfWeek(viewDate);
        return (
            <div className="flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="flex border-b border-slate-200 bg-slate-50">
                    <div className="w-20 border-r border-slate-200 flex items-center justify-center"><Clock className="h-4 w-4 text-slate-300" /></div>
                    {[0, 1, 2, 3, 4, 5, 6].map(idx => {
                        const current = new Date(startOfWeek);
                        current.setDate(startOfWeek.getDate() + idx);
                        const dStr = current.toISOString().split('T')[0];
                        const isToday = new Date().toDateString() === current.toDateString();
                        const holiday = isAustrianHoliday(dStr, companySettings?.state);
                        return (
                            <div key={idx} className={cn("flex-1 py-4 text-center border-r border-slate-200 last:border-0", isToday && "bg-indigo-50/50")}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{holiday ? holiday.name : weekDays[idx]}</p>
                                <p className={cn("text-2xl font-black", isToday ? "text-indigo-600" : (holiday ? "text-purple-600" : "text-slate-900"))}>{current.getDate()}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="flex max-h-[600px] overflow-y-auto custom-scrollbar">
                    <div className="w-20 border-r border-slate-200 bg-slate-50/30">
                        {hours.map(h => (
                            <div key={h} className="h-20 border-b border-slate-100 flex items-start justify-center pt-2 text-[10px] font-bold text-slate-400">{h}</div>
                        ))}
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map(idx => {
                        const current = new Date(startOfWeek);
                        current.setDate(startOfWeek.getDate() + idx);
                        const dStr = current.toISOString().split('T')[0];
                        const holiday = isAustrianHoliday(dStr, companySettings?.state);
                        return (
                            <div 
                                key={idx} 
                                className={cn(
                                    "flex-1 border-r border-slate-100 last:border-0 relative",
                                    holiday && "bg-purple-100/60"
                                )}
                            >
                                {hours.map(h => (
                                    <div 
                                        key={h} 
                                        onClick={() => handleAddEvent(dStr, h)} 
                                        className="h-20 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                                    />
                                ))}
                                {events.filter(e => e.startDate === dStr && e.startTime).map(e => {
                                    const h = parseInt(e.startTime!.split(':')[0]);
                                    const m = parseInt(e.startTime!.split(':')[1] || "0");
                                    const top = (h - 7) * 80 + (m / 60) * 80;
                                    
                                    let height = 80; // Standard 1h
                                    if (e.endTime) {
                                        const eh = parseInt(e.endTime.split(':')[0]);
                                        const em = parseInt(e.endTime.split(':')[1] || "0");
                                        const durationMinutes = (eh * 60 + em) - (h * 60 + m);
                                        height = (durationMinutes / 60) * 80;
                                    }

                                    return (
                                        <div 
                                            key={e.id} 
                                            onClick={() => { setEditingEvent(e); setIsModalOpen(true); }}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            className={cn(
                                                "absolute inset-x-1 rounded-xl p-2 shadow-sm border-l-4 cursor-pointer z-10 transition-transform hover:scale-[1.01] overflow-hidden",
                                                e.type === 'important' ? "bg-rose-50 border-rose-500 text-rose-900" : "bg-indigo-50 border-indigo-500 text-indigo-900"
                                            )}
                                        >
                                            <p className="text-[9px] font-black truncate">{e.startTime} - {e.endTime}</p>
                                            <p className="text-xs font-bold truncate leading-tight">{e.title}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Day View ────────────────────────────────────────────────────────────
    const renderDayView = () => {
        const dStr = selectedDate.toISOString().split('T')[0];
        const holiday = isAustrianHoliday(dStr, companySettings?.state);
        const dayEvents = events.filter(e => e.startDate === dStr);

        return (
            <div className={cn(
                "bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex",
                isCompact ? "flex-col" : "flex-col md:flex-row"
            )}>
                <div className={cn(
                    "bg-slate-50 p-6 flex flex-col gap-4",
                    isCompact ? "w-full border-b border-slate-200" : "w-full md:w-64 border-r border-slate-200"
                )}>
                    <div className={cn("flex items-baseline gap-2", isCompact ? "justify-between" : "flex-col")}>
                        <div>
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">Ausgewählter Tag</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900">{selectedDate.getDate()}.</span>
                                <span className="text-sm font-bold text-slate-500">{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                            </div>
                        </div>
                        {isCompact && (
                            <button onClick={() => handleAddEvent(dStr)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 flex items-center gap-1.5 hover:bg-indigo-700 transition-all">
                                <Plus className="h-3.5 w-3.5" /> Neuer Termin
                            </button>
                        )}
                    </div>
                    {holiday && (
                        <div className="bg-purple-100 p-3 rounded-xl border border-purple-200">
                            <p className="text-[8px] font-black text-purple-600 uppercase tracking-widest mb-0.5">Feiertag</p>
                            <p className="font-bold text-purple-900 text-xs">{holiday.name}</p>
                        </div>
                    )}
                    {!isCompact && (
                        <div className="mt-auto">
                            <button onClick={() => handleAddEvent(dStr)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                                <Plus className="h-4 w-4" /> Neuer Termin
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {hours.map(h => {
                        const currentHour = parseInt(h.split(':')[0]);
                        const event = dayEvents.find(e => {
                            if (!e.startTime) return false;
                            const startH = parseInt(e.startTime.split(':')[0]);
                            const endH = e.endTime ? parseInt(e.endTime.split(':')[0]) : startH;
                            return currentHour >= startH && currentHour <= endH;
                        });
                        const isStart = event?.startTime?.startsWith(h.split(':')[0]);
                        return (
                            <div key={h} className="flex gap-6 group mb-4 last:mb-0">
                                <span className="w-12 text-right text-xs font-black text-slate-300 pt-4 tabular-nums">{h}</span>
                                <div 
                                    onClick={() => event ? (setEditingEvent(event), setIsModalOpen(true)) : handleAddEvent(dStr, h)}
                                    className={cn(
                                        "flex-1 min-h-[70px] border p-4 transition-all flex flex-col justify-center cursor-pointer",
                                        event 
                                            ? (event.type === 'important' ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100') 
                                            : 'rounded-2xl border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50',
                                        event && isStart && "rounded-t-2xl border-b-0",
                                        event && !isStart && "border-y-0 opacity-80",
                                        event && event.endTime?.startsWith(h.split(':')[0]) && "rounded-b-2xl border-t-0"
                                    )}
                                >
                                    {event && isStart ? (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{event.title}</p>
                                                <p className="text-xs font-bold text-slate-500">{event.startTime} - {event.endTime}</p>
                                            </div>
                                            {event.type === 'important' && <AlertCircle className="h-5 w-5 text-rose-500" />}
                                        </div>
                                    ) : !event ? (
                                        <Plus className="h-4 w-4 text-slate-200 group-hover:text-indigo-400 mx-auto" />
                                    ) : null}
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
            "flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700",
            isFullscreen ? "fixed inset-0 z-[100] bg-slate-50 p-10 overflow-y-auto" : ""
        )}>
            {/* Calendar Header Control Bar */}
            {isCompact ? (
                <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight pl-2">
                        {monthNames[viewDate.getMonth()]} <span className="text-indigo-600">{viewDate.getFullYear()}</span>
                    </h2>
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button onClick={handlePrev} className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-slate-500 shadow-none"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={handleToday} className="px-3 py-1.5 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-none">Heute</button>
                        <button onClick={handleNext} className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-slate-500 shadow-none"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Navigation & Title */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <button onClick={handlePrev} className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-slate-500 shadow-none hover:shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
                            <button onClick={handleToday} className="px-4 py-2 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-slate-500 shadow-none hover:shadow-sm">Heute</button>
                            <button onClick={handleNext} className="p-2 hover:bg-white hover:text-indigo-600 rounded-xl transition-all text-slate-500 shadow-none hover:shadow-sm"><ChevronRight className="h-5 w-5" /></button>
                        </div>
                        <div className="hidden lg:block">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {monthNames[viewDate.getMonth()]} <span className="text-indigo-600">{viewDate.getFullYear()}</span>
                            </h2>
                        </div>
                    </div>

                    {/* View Switcher (Segmented Control) */}
                    <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button 
                            onClick={() => setViewType('month')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                                viewType === 'month' ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Monat
                        </button>
                        <button 
                            onClick={() => setViewType('week')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                                viewType === 'week' ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <CalendarDays className="h-3.5 w-3.5" /> Woche
                        </button>
                        <button 
                            onClick={() => setViewType('day')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                                viewType === 'day' ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <List className="h-3.5 w-3.5" /> Tag
                        </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                            title="Vollbild"
                        >
                            <Maximize2 className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={() => handleAddEvent()}
                            className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-xl shadow-indigo-200 active:scale-95"
                        >
                            <Plus className="h-5 w-5" /> Neu
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-sm z-[60] flex items-center justify-center rounded-[2rem]">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Wird geladen...</p>
                        </div>
                    </div>
                )}
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    {viewType === 'month' && renderMonthView()}
                    {viewType === 'week' && renderWeekView()}
                    {viewType === 'day' && renderDayView()}
                </div>
            </div>

            {/* Modals */}
            {isModalOpen && (
                <EventModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    initialDate={selectedDate.toISOString().split('T')[0]} 
                    initialStartTime={selectedHour} 
                    editingEvent={editingEvent} 
                    onAddEvent={addEvent} 
                    onUpdateEvent={updateEvent} 
                    onDeleteEvent={deleteEvent}
                />
            )}
        </div>
    );
}
