"use client";

import React, { useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { TimeEntry } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { CompanyData } from "@/types/company";
import { TimeTrackingPDF } from "@/components/TimeTrackingPDF";

interface TimeTrackingPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    entries: TimeEntry[];
    employee: Employee | null;
    month: string;
    companySettings: CompanyData | null;
}

export function TimeTrackingPreviewModal({ isOpen, onClose, entries, employee, month, companySettings }: TimeTrackingPreviewModalProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    if (!isOpen || !employee || !companySettings) return null;

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { TimesheetReactPDF } = await import('@/components/TimesheetReactPDF');
            const blob = await pdf(
                React.createElement(TimesheetReactPDF, { entries, employee, month, companySettings }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (e) {
            console.error('[PDF Timesheet]', e);
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-5xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200 no-print">
                {/* Header */}
                <div className="px-8 py-6 flex justify-between items-center bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 text-white shrink-0 no-print">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Zeitdokument</p>
                        <h2 className="text-2xl font-black tracking-tight mt-1">
                            Export Vorschau
                        </h2>
                        <p className="text-sm text-white/60 font-medium mt-1">
                            {employee.personalData.firstName} {employee.personalData.lastName} • {month}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isPrinting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> PDF wird erstellt...</>
                            ) : (
                                <><Download className="h-4 w-4" /> PDF Erstellen</>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* HTML Preview */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 no-print">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl">
                        <TimeTrackingPDF
                            entries={entries}
                            employee={employee}
                            month={month}
                            companySettings={companySettings}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
