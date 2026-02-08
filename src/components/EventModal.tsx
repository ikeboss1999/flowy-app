"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Type, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent, CalendarEventType } from '@/types/calendar';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate: string;
    initialStartTime?: string;
    initialEndTime?: string;
    editingEvent?: CalendarEvent;
    onAddEvent: (data: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => void;
    onUpdateEvent: (id: string, data: Partial<CalendarEvent>) => void;
}

export function EventModal({
    isOpen,
    onClose,
    initialDate,
    initialStartTime,
    initialEndTime,
    editingEvent,
    onAddEvent,
    onUpdateEvent
}: EventModalProps) {
    const [title, setTitle] = useState(editingEvent?.title || "");
    const [description, setDescription] = useState(editingEvent?.description || "");
    const [startDate, setStartDate] = useState(editingEvent?.startDate || initialDate);
    const [startTime, setStartTime] = useState(editingEvent?.startTime || initialStartTime || "");
    const [endTime, setEndTime] = useState(editingEvent?.endTime || initialEndTime || "");
    const [type, setType] = useState<CalendarEventType>(editingEvent?.type || "work");

    // Helper: Add 1.5 hours to a HH:mm string
    const calculateDefaultEndTime = (start: string) => {
        if (!start) return "";
        const [h, m] = start.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + 90, 0, 0); // 90 mins = 1.5h
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Auto-calculate end time for new events
    useEffect(() => {
        if (!editingEvent && startTime && !endTime) {
            setEndTime(calculateDefaultEndTime(startTime));
        }
    }, [startTime, editingEvent, endTime]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const eventData = {
            title,
            description,
            startDate,
            endDate: startDate, // For now, single day events
            startTime,
            endTime,
            type,
            isAllDay: !startTime,
            color: type === 'important' ? '#f43f5e' : (type === 'work' ? '#6366f1' : '#10b981'),
            location: '',
            attendees: [],
            projectId: ''
        };

        if (editingEvent) {
            onUpdateEvent(editingEvent.id, eventData);
        } else {
            onAddEvent(eventData);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-primary-gradient p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-16 -mt-16" />
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-2 block">Kalender</span>
                            <h2 className="text-4xl font-black text-white tracking-tight font-outfit">
                                {editingEvent ? "Termin bearbeiten" : "Neuer Termin"}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {/* Title input */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                            <Type className="h-3 w-3" /> Titel
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Z.B. Besprechung mit Kunde..."
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Date */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <CalendarIcon className="h-3 w-3" /> Datum
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all flex justify-between"
                                required
                            />
                        </div>

                        {/* Type */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Type className="h-3 w-3" /> Priorität
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as CalendarEventType)}
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all appearance-none"
                            >
                                <option value="work">Business</option>
                                <option value="personal">Privat</option>
                                <option value="important">Wichtig</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Start Time */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Clock className="h-3 w-3" /> Beginn
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all"
                            />
                        </div>

                        {/* End Time */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                <Clock className="h-3 w-3" /> Ende
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                            <AlignLeft className="h-3 w-3" /> Beschreibung (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Zusätzliche Infos..."
                            rows={3}
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-5 border-2 border-slate-100 text-slate-400 font-black rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest text-sm"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-primary-gradient text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest shadow-black/10"
                        >
                            {editingEvent ? "Speichern" : "Termin erstellen"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
