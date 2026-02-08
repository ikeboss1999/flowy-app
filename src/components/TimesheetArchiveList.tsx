"use client";

import React, { useState } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { FileText, Calendar, ArrowRight, CheckCircle, Download, Folder, ChevronRight, ChevronDown } from 'lucide-react';
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
    const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);

    // Filter only finalized
    const finalized = timesheets
        .filter(t => t.status === 'finalized')
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

    // Group by employee
    const groupedByEmployee = finalized.reduce((acc, sheet) => {
        if (!acc[sheet.employeeId]) acc[sheet.employeeId] = [];
        acc[sheet.employeeId].push(sheet);
        return acc;
    }, {} as Record<string, typeof finalized>);

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.personalData.firstName} ${emp.personalData.lastName}` : "Unbekannt";
    };

    const toggleEmployee = (id: string) => {
        setExpandedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const handleOpen = (month: string, employeeId: string) => {
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
        <div className="space-y-4">
            {Object.entries(groupedByEmployee).map(([employeeId, sheets]) => {
                const isExpanded = expandedEmployees.includes(employeeId);
                const employeeName = getEmployeeName(employeeId);

                return (
                    <div key={employeeId} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                        {/* Folder Header */}
                        <button
                            onClick={() => toggleEmployee(employeeId)}
                            className="w-full flex items-center justify-between px-8 py-6 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <Folder className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black text-slate-900 leading-none mb-1">{employeeName}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{sheets.length} Stundenzettel im Archiv</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                            </div>
                        </button>

                        {/* Folder Content (Table) */}
                        {isExpanded && (
                            <div className="border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monat</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Abgeschlossen am</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                            <th className="px-8 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {sheets.map((sheet) => (
                                            <tr key={sheet.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 font-bold text-slate-900 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="h-4 w-4 text-indigo-500" />
                                                        {new Date(sheet.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-slate-500 text-sm">
                                                    {sheet.finalizedAt ? new Date(sheet.finalizedAt).toLocaleDateString('de-DE') : '-'}
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 uppercase tracking-wider">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Abgeschlossen
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
                                                        <input
                                                            type="button"
                                                            onClick={() => handleOpen(sheet.month, sheet.employeeId)}
                                                            value="Öffnen"
                                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[11px] hover:bg-indigo-100 transition-all cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

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
