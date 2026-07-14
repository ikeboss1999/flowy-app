"use client";

import React from 'react';
import { CalendarWidget } from '@/components/CalendarWidget';
import { CalendarDays } from 'lucide-react';
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function CalendarPage() {
    usePermissionGuard("calendar_use");
    return (
        <div className="dashboard-page">
            <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl shadow-indigo-950/15 sm:p-8">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
                <div className="relative">
                    <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15">
                        <CalendarDays className="h-5 w-5 text-cyan-100" />
                        <span className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">Kalender</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl font-outfit">Terminkalender</h2>
                    <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-white/70">
                        Verwalte deine Termine und plane deine Woche.
                    </p>
                </div>
            </section>

            {/* Full Calendar View */}
            <div className="w-full">
                <CalendarWidget isCompact={false} />
            </div>
        </div>
    );
}
