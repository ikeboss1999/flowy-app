"use client";

import React from 'react';
import { useSync } from '@/context/SyncContext';
import { Cloud, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncNotice() {
    const { status, isBlocking } = useSync();

    if (status !== 'syncing' || !isBlocking) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center border border-slate-100">
                <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Cloud className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-28 w-28 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900">Synchronisierung</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Deine Daten werden gerade sicher in der Cloud gespeichert. Bitte warte einen Moment...
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <RefreshCcw className="h-3 w-3 animate-spin" />
                    Server Verbindung Aktiv
                </div>
            </div>
        </div>
    );
}
