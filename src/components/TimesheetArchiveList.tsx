"use client";

import React, { useState } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { FileText, Calendar, ArrowRight, CheckCircle, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TimeTrackingPreviewModal } from './TimeTrackingPreviewModal';
import { Employee } from '@/types/employee';

export function TimesheetArchiveList() {
    const { timesheets, entries } = useTimeEntries();
    const { employees } = useEmployees();
    const { data: companySettings } = useCompanySettings();
    const router = useRouter();

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    // Filter only finalized
    const finalized = timesheets
        .filter(t => t.status === 'finalized')
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.personalData.firstName} ${emp.personalData.lastName}` : "Unbekannt";
    };

    const handleOpen = (month: string, employeeId: string) => {
        // Ideally pass filtering params via URL (e.g. /time-tracking?month=...&employee=...)
        // For now navigation only.
        router.push('/time-tracking');
    };

    const handleDownload = (month: string, employeeId: string) => {
        const emp = employees.find(e => e.id === employeeId) || null;
        setSelectedEmployee(emp);
        setSelectedMonth(month);
        setIsPreviewModalOpen(true);
    };

    const getFilteredEntries = () => {
        if (!selectedEmployee || !selectedMonth) return [];
        return entries.filter(entry =>
            entry.employeeId === selectedEmployee.id &&
            entry.date.startsWith(selectedMonth)
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    if (finalized.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Kein Archiv</h3>
                <p className="text-slate-500">Es wurden noch keine Stundenzettel abgeschlossen.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Monat</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Mitarbeiter</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Abgeschlossen am</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-5 w-40 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {finalized.map((sheet) => (
                            <tr key={sheet.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5 font-bold text-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        {new Date(sheet.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                                    </div>
                                </td>
                                <td className="px-8 py-5 font-medium text-slate-700">
                                    {getEmployeeName(sheet.employeeId)}
                                </td>
                                <td className="px-8 py-5 text-slate-500">
                                    {sheet.finalizedAt ? new Date(sheet.finalizedAt).toLocaleDateString('de-DE') : '-'}
                                </td>
                                <td className="px-8 py-5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                        <CheckCircle className="h-3 w-3" />
                                        Finalisiert
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleDownload(sheet.month, sheet.employeeId)}
                                            className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                                            title="PDF Herunterladen"
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpen(sheet.month, sheet.employeeId)}
                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center gap-2"
                                        >
                                            Öffnen <ArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <TimeTrackingPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                entries={getFilteredEntries()}
                employee={selectedEmployee}
                month={selectedMonth}
                companySettings={companySettings}
            />
        </div>
    );
}
