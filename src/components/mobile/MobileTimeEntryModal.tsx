"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Clock,
    Calendar,
    Briefcase,
    MapPin,
    CheckCircle2,
    Trash2
} from "lucide-react";
import { TimeEntry, TimeEntryType } from "@/types/time-tracking";
import { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface MobileTimeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: TimeEntry) => void;
    onDelete?: (id: string) => void;
    projects: Project[];
    initialEntry?: Partial<TimeEntry>;
    selectedDate: string; // YYYY-MM-DD
    userId?: string;
    employeeId?: string;
}

export function MobileTimeEntryModal({
    isOpen,
    onClose,
    onSave,
    onDelete,
    projects,
    initialEntry,
    selectedDate,
    userId,
    employeeId
}: MobileTimeEntryModalProps) {
    const [formData, setFormData] = useState<Partial<TimeEntry>>({
        startTime: "08:00",
        endTime: "17:00",
        location: "",
        projectId: "",
        type: "WORK",
        breakDuration: 0
    });

    useEffect(() => {
        if (isOpen) {
            if (initialEntry?.id) {
                setFormData(initialEntry);
            } else {
                setFormData({
                    startTime: "08:00",
                    endTime: "17:00",
                    location: initialEntry?.location || "",
                    projectId: initialEntry?.projectId || "",
                    type: "WORK",
                    breakDuration: 0
                });
            }
        }
    }, [isOpen, initialEntry]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate duration
        const [startH, startM] = (formData.startTime || "00:00").split(':').map(Number);
        const [endH, endM] = (formData.endTime || "00:00").split(':').map(Number);
        const startTotal = (startH * 60) + startM;
        const endTotal = (endH * 60) + endM;
        const duration = Math.max(0, endTotal - startTotal - (formData.breakDuration || 0));

        const entry: TimeEntry = {
            id: formData.id || nanoid(),
            employeeId: employeeId || "",
            userId: userId || "",
            date: selectedDate,
            startTime: formData.startTime || "08:00",
            endTime: formData.endTime || "17:00",
            breakDuration: formData.breakDuration || 0,
            duration: duration,
            type: (formData.type as TimeEntryType) || "WORK",
            projectId: formData.projectId,
            location: formData.location,
            createdAt: formData.createdAt || new Date().toISOString()
        };

        onSave(entry);
    };

    const displayDate = new Date(selectedDate).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long"
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-500">
                {/* Drag Handle for Mobile */}
                <div className="sm:hidden w-full flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {initialEntry?.id ? "Eintrag bearbeiten" : "Zeit eintragen"}
                        </h2>
                        <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">
                            {displayDate}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 active:scale-90 transition-all"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Time Selectors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Von</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bis</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location & Project */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Arbeitsort</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="z.B. Baustelle Wien"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Projekt (Optional)</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none"
                                >
                                    <option value="">Kein Projekt</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <CheckCircle2 className="h-6 w-6" />
                            Speichern
                        </button>

                        {initialEntry?.id && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(initialEntry.id!)}
                                className="w-full py-4 text-rose-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eintrag löschen
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
