"use client";

import React, { useRef, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { TimeEntry } from "@/types/time-tracking";
import { Employee } from "@/types/employee";
import { CompanyData } from "@/types/company";
import { TimeTrackingPDF } from "@/components/TimeTrackingPDF";
import { TimeTrackingPrintHandler } from "@/components/TimeTrackingPrintHandler";

interface TimeTrackingPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    entries: TimeEntry[];
    employee: Employee | null;
    month: string;
    companySettings: CompanyData | null;
}

export function TimeTrackingPreviewModal({ isOpen, onClose, entries, employee, month, companySettings }: TimeTrackingPreviewModalProps) {
    const pdfRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    if (!isOpen || !employee || !companySettings) return null;

    const handlePrint = () => {
        setIsPrinting(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 no-print">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200 no-print">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0 no-print">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                            Export Vorschau
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {employee.personalData.firstName} {employee.personalData.lastName} • {month}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-primary-gradient text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            PDF erstellen / Drucken
                        </button>
                        <button
                            onClick={onClose}
                            className="h-10 w-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-8 no-print">
                    <div className="max-w-[210mm] mx-auto bg-white shadow-xl">
                        <TimeTrackingPDF
                            ref={pdfRef}
                            entries={entries}
                            employee={employee}
                            month={month}
                            companySettings={companySettings}
                        />
                    </div>
                </div>
            </div>

            {/* Hidden Print Handler */}
            {isPrinting && (
                <TimeTrackingPrintHandler onAfterPrint={() => setIsPrinting(false)}>
                    <TimeTrackingPDF
                        entries={entries}
                        employee={employee}
                        month={month}
                        companySettings={companySettings}
                    />
                </TimeTrackingPrintHandler>
            )}
        </div>
    );
}
