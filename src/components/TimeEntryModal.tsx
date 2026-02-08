"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Clock,
    Calendar,
    Briefcase,
    FileText,
    User,
    CheckCircle2
} from "lucide-react";
import { TimeEntry, TimeEntryType } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { cn } from "@/lib/utils";

interface TimeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: TimeEntry) => void;
    employees: Employee[];
    initialEntry?: TimeEntry;
}

export function TimeEntryModal({ isOpen, onClose, onSave, employees, initialEntry }: TimeEntryModalProps) {
    const [formData, setFormData] = useState<TimeEntry>(() => initialEntry || {
        id: Math.random().toString(36).substr(2, 9),
        employeeId: employees[0]?.id || "",
        date: new Date().toISOString().split('T')[0],
        startTime: "08:00",
        endTime: "17:00",
        breakDuration: 60,
        type: "WORK",
        projectId: "",
        location: "",
        notes: "",
        createdAt: new Date().toISOString(),
    });

    useEffect(() => {
        if (initialEntry) {
            setFormData(initialEntry);
        } else if (isOpen) {
            // Reset form when opening fresh
            setFormData({
                id: Math.random().toString(36).substr(2, 9),
                employeeId: employees[0]?.id || "",
                date: new Date().toISOString().split('T')[0],
                startTime: "08:00",
                endTime: "17:00",
                breakDuration: 60,
                type: "WORK",
                projectId: "",
                location: "",
                notes: "",
                createdAt: new Date().toISOString(),
            });
        }
    }, [initialEntry, isOpen, employees]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 font-outfit">
                            {initialEntry ? "Eintrag bearbeiten" : "Zeit erfassen"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-100/50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Mitarbeiter</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <select
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                            >
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.personalData.firstName} {emp.personalData.lastName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Datum</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Typ</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as TimeEntryType })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="WORK">Arbeit</option>
                                <option value="BAD_WEATHER">Schlechtwetter</option>
                                <option value="WORK_BAD_WEATHER">Gearbeitet + Schlechtwetter</option>
                                <option value="VACATION">Urlaub</option>
                                <option value="SICK">Krank</option>
                                <option value="HOLIDAY">Feiertag</option>
                                <option value="OFF">Frei</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Start</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-center font-medium focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Ende</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-center font-medium focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Pause (Min)</label>
                            <input
                                type="number"
                                value={formData.breakDuration}
                                onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-center font-medium focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Projekt</label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.projectId || ""}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                    placeholder="z.B. Projekt #123"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Arbeitsort</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.location || ""}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
                                    placeholder="z.B. München"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary-gradient text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="h-5 w-5" /> Speichern
                    </button>
                </form>
            </div>
        </div>
    );
}
