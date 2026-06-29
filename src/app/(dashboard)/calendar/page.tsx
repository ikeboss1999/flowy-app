"use client";

import React from 'react';
import { CalendarWidget } from '@/components/CalendarWidget';
import { CalendarDays } from 'lucide-react';
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

export default function CalendarPage() {
    usePermissionGuard("calendar_use");
    return (
        <div className="p-8 lg:p-12 space-y-12 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight font-outfit">Terminkalender</h2>
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                        Verwalte deine Termine und Plane deine Woche.
                    </p>
                </div>
            </div>

            {/* Full Calendar View */}
            <div className="w-full">
                <CalendarWidget isCompact={false} />
            </div>
        </div>
    );
}
