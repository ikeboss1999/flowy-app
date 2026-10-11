"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { FileText, Calendar, CheckCircle, Download, Folder, ChevronRight, ChevronDown, Eye, Loader2, X, Files } from 'lucide-react';
import { TimeTrackingPreviewModal } from './TimeTrackingPreviewModal';
import { Employee } from '@/types/employee';
import { TimesheetMeta } from '@/types/time-tracking';
import { timesheetPdfFileName } from '@/lib/document-filenames';
import { useNotification } from '@/context/NotificationContext';

export function TimesheetArchiveList() {
    const { timesheets, entries, isLoading: timeEntriesLoading } = useTimeEntries();
    const { employees, isLoading: employeesLoading } = useEmployees();
    const { data: companySettings } = useCompanySettings();

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [storedPreviewUrl, setStoredPreviewUrl] = useState<string | null>(null);
    const [storedPreviewTitle, setStoredPreviewTitle] = useState('');
    const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [yearFilter, setYearFilter] = useState('all');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isMonthExportOpen, setIsMonthExportOpen] = useState(false);
    const [exportMonth, setExportMonth] = useState('');
    const [isExportingMonth, setIsExportingMonth] = useState(false);
    const { showToast } = useNotification();

    const getEmployee = useCallback((id: string) => employees.find(e => e.id === id) ?? null, [employees]);
    const isActiveEmployee = (employee: Employee | null) => !!employee && employee.employment.isActive !== false;

    const employeesWithFinalizedTimesheets = useMemo(() => {
        return employees
            .filter(emp => timesheets.some(t => t.status === 'finalized' && t.employeeId === emp.id))
            .sort((a, b) => (a.employeeNumber || '').localeCompare(b.employeeNumber || ''));
    }, [employees, timesheets]);

    const inactiveEmployeesWithFinalizedTimesheets = useMemo(() => {
        return employeesWithFinalizedTimesheets.filter(emp => !isActiveEmployee(emp));
    }, [employeesWithFinalizedTimesheets]);

    const selectableEmployees = useMemo(() => {
        return employeesWithFinalizedTimesheets.filter(emp => showInactiveEmployees || isActiveEmployee(emp));
    }, [employeesWithFinalizedTimesheets, showInactiveEmployees]);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (employeeFilter === 'all' || showInactiveEmployees) return;

        const selected = getEmployee(employeeFilter);
        if (!isActiveEmployee(selected)) {
            setEmployeeFilter('all');
        }
    }, [employeeFilter, getEmployee, showInactiveEmployees]);

    const finalized = useMemo(() => {
        return timesheets
            .filter(t => t.status === 'finalized')
            .filter(t => showInactiveEmployees || isActiveEmployee(getEmployee(t.employeeId)))
            .filter(t => yearFilter === 'all' || t.month.startsWith(yearFilter))
            .filter(t => employeeFilter === 'all' || t.employeeId === employeeFilter)
            .filter(t => {
                if (!searchTerm.trim()) return true;
                const emp = getEmployee(t.employeeId);
                const employeeName = emp ? `${emp.employeeNumber} ${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase() : '';
                const monthLabel = new Date(t.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }).toLowerCase();
                return employeeName.includes(searchTerm.toLowerCase()) || monthLabel.includes(searchTerm.toLowerCase());
            })
            .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
    }, [timesheets, getEmployee, searchTerm, yearFilter, employeeFilter, showInactiveEmployees]);

    const years = useMemo(() => {
        return Array.from(new Set(
            timesheets
                .filter(t => t.status === 'finalized')
                .map(t => t.month.slice(0, 4))
        )).sort((a, b) => b.localeCompare(a));
    }, [timesheets]);

    // This deliberately ignores the visible archive filters: a monthly export
    // must always contain every finalized employee timesheet for that month.
    const archiveMonths = useMemo(() => {
        return Array.from(new Set(
            timesheets
                .filter(t => t.status === 'finalized')
                .map(t => t.month.slice(0, 7))
        )).sort((a, b) => b.localeCompare(a));
    }, [timesheets]);

    const formatMonth = (month: string) => {
        const [year, monthNumber] = month.split('-').map(Number);
        return new Date(year, monthNumber - 1, 1).toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric',
        });
    };

    const groupedByEmployee = finalized.reduce((acc, sheet) => {
        if (!acc[sheet.employeeId]) acc[sheet.employeeId] = [];
        acc[sheet.employeeId].push(sheet);
        return acc;
    }, {} as Record<string, typeof finalized>);

    const toggleEmployee = (id: string) => {
        setExpandedEmployees(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    const fetchSignedTimesheetPdfUrl = async (timesheetId: string, download = false) => {
        const res = await fetch(`/api/timesheets/pdf-url?id=${encodeURIComponent(timesheetId)}${download ? '&download=1' : ''}`);
        if (!res.ok) {
            const text = await res.text().catch(() => String(res.status));
            throw new Error(`PDF URL failed: ${res.status} ${text}`);
        }
        const data = await res.json();
        return data.url as string;
    };

    // Opens the locked PDF if available, otherwise falls back to HTML preview.
    const handlePreview = async (sheet: TimesheetMeta) => {
        const emp = getEmployee(sheet.employeeId);
        const title = emp
            ? `Stundenzettel ${emp.personalData.firstName} ${emp.personalData.lastName} - ${sheet.month}`
            : `Stundenzettel ${sheet.month}`;

        if (sheet.pdfUrl) {
            setPreviewLoadingId(sheet.id);
            try {
                const url = await fetchSignedTimesheetPdfUrl(sheet.id);
                setStoredPreviewUrl(url);
                setStoredPreviewTitle(title);
                return;
            } catch (err) {
                console.error('[Timesheet PDF Preview]', err);
            } finally {
                setPreviewLoadingId(null);
            }
        }

        setStoredPreviewUrl(null);
        setStoredPreviewTitle('');
        setSelectedEmployee(emp);
        setSelectedMonth(sheet.month.slice(0, 7));
        setIsPreviewModalOpen(true);
    };

    const closeStoredPreview = () => {
        setStoredPreviewUrl(null);
        setStoredPreviewTitle('');
    };

    // Directly generates and downloads the PDF without opening the modal
    const handleDownload = async (sheet: TimesheetMeta) => {
        const sheetKey = `${sheet.employeeId}-${sheet.month}`;
        const emp = getEmployee(sheet.employeeId);
        if (!emp || !companySettings) return;

        setDownloadingIds(prev => new Set(prev).add(sheetKey));
        try {
            if (sheet.pdfUrl) {
                const pdfUrl = await fetchSignedTimesheetPdfUrl(sheet.id, true);
                const response = await fetch(pdfUrl);
                if (!response.ok) throw new Error(`PDF download failed: ${response.status}`);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = timesheetPdfFileName(
                    `${emp.personalData.firstName} ${emp.personalData.lastName}`,
                    sheet.month,
                );
                a.click();
                URL.revokeObjectURL(url);
                return;
            }

            const normalizedMonth = sheet.month.slice(0, 7);
            const sheetEntries = entries
                .filter(e => e.employeeId === sheet.employeeId && e.date.startsWith(normalizedMonth))
                .sort((a, b) => a.date.localeCompare(b.date));

            const { pdf } = await import('@react-pdf/renderer');
            const { TimesheetReactPDF } = await import('@/components/TimesheetReactPDF');
            const blob = await pdf(
                React.createElement(TimesheetReactPDF, {
                    entries: sheetEntries,
                    employee: emp,
                    month: normalizedMonth,
                    companySettings,
                }) as any
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = timesheetPdfFileName(
                `${emp.personalData.firstName} ${emp.personalData.lastName}`,
                normalizedMonth,
            );
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[PDF Download]', err);
        } finally {
            setDownloadingIds(prev => { const n = new Set(prev); n.delete(sheetKey); return n; });
        }
    };

    const openMonthExport = () => {
        setExportMonth(current => current || archiveMonths[0] || '');
        setIsMonthExportOpen(true);
    };

    const handleMonthExport = async () => {
        if (!exportMonth || isExportingMonth) return;

        const sheetsForMonth = timesheets
            .filter(sheet => sheet.status === 'finalized' && sheet.month.slice(0, 7) === exportMonth)
            .sort((a, b) => {
                const employeeA = getEmployee(a.employeeId);
                const employeeB = getEmployee(b.employeeId);
                return (employeeA?.employeeNumber || '').localeCompare(employeeB?.employeeNumber || '', undefined, { numeric: true });
            });

        if (!sheetsForMonth.length) {
            showToast('Für diesen Monat gibt es keine abgeschlossenen Stundenzettel.', 'info');
            return;
        }

        const missingPdfs = sheetsForMonth.filter(sheet => !sheet.pdfUrl);
        if (missingPdfs.length) {
            showToast('Mindestens ein Stundenzettel dieses Monats besitzt keine gespeicherte PDF. Der Sammel-Export wurde nicht erstellt.', 'error');
            return;
        }

        setIsExportingMonth(true);
        try {
            const { PDFDocument } = await import('pdf-lib');
            const mergedPdf = await PDFDocument.create();

            for (const sheet of sheetsForMonth) {
                const signedUrl = await fetchSignedTimesheetPdfUrl(sheet.id, true);
                const response = await fetch(signedUrl);
                if (!response.ok) {
                    const employee = getEmployee(sheet.employeeId);
                    const name = employee
                        ? `${employee.personalData.firstName} ${employee.personalData.lastName}`
                        : 'eines Mitarbeiters';
                    throw new Error(`Die PDF von ${name} konnte nicht geladen werden.`);
                }

                const sourcePdf = await PDFDocument.load(await (await response.blob()).arrayBuffer());
                const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }

            const bytes = await mergedPdf.save();
            const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Zeiterfassung-${exportMonth}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

            showToast(`${sheetsForMonth.length} Stundenzettel wurden zu einer PDF zusammengefügt.`, 'success');
            setIsMonthExportOpen(false);
        } catch (error) {
            console.error('[Timesheet month export]', error);
            showToast(error instanceof Error ? error.message : 'Der Sammel-Export konnte nicht erstellt werden.', 'error');
        } finally {
            setIsExportingMonth(false);
        }
    };

    const getFilteredEntries = () => {
        if (!selectedEmployee || !selectedMonth) return [];
        return entries
            .filter(e => e.employeeId === selectedEmployee.id && e.date.startsWith(selectedMonth))
            .sort((a, b) => a.date.localeCompare(b.date));
    };

    if (!hasMounted || employeesLoading || timeEntriesLoading) {
        return (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium">Archivdaten werden geladen...</p>
            </div>
        );
    }

    if (timesheets.filter(t => t.status === 'finalized').length === 0) {
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
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 grid grid-cols-1 md:grid-cols-[1fr_180px_240px_auto_auto] gap-3">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Archiv durchsuchen..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700 placeholder:text-slate-400"
                />
                <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
                >
                    <option value="all">Alle Jahre</option>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
                >
                    <option value="all">Alle Mitarbeiter</option>
                    {selectableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                            #{emp.employeeNumber || '---'} {emp.personalData.firstName} {emp.personalData.lastName}
                            {!isActiveEmployee(emp) ? ' (Archiviert)' : ''}
                        </option>
                    ))}
                </select>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 md:justify-center md:whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={showInactiveEmployees}
                        onChange={(e) => setShowInactiveEmployees(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Archivierte anzeigen</span>
                    {inactiveEmployeesWithFinalizedTimesheets.length > 0 && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500">
                            {inactiveEmployeesWithFinalizedTimesheets.length}
                        </span>
                    )}
                </label>
                <button
                    type="button"
                    onClick={openMonthExport}
                    disabled={!archiveMonths.length}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Files className="h-4 w-4" />
                    Monats-Export
                </button>
            </div>

            {finalized.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
                    <FileText className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-bold">Keine Stundenzettel für diese Filter gefunden.</p>
                </div>
            )}

            {Object.entries(groupedByEmployee)
                .sort((a, b) => {
                    const empA = getEmployee(a[0]);
                    const empB = getEmployee(b[0]);
                    const numA = empA ? parseInt(empA.employeeNumber.replace(/\D/g, "")) || 0 : 0;
                    const numB = empB ? parseInt(empB.employeeNumber.replace(/\D/g, "")) || 0 : 0;
                    return numA - numB;
                })
                .map(([employeeId, sheets]) => {
                    const isExpanded = expandedEmployees.includes(employeeId);
                    const emp = getEmployee(employeeId);
                    const displayName = emp 
                        ? `#${emp.employeeNumber || "---"} - ${emp.personalData.firstName} ${emp.personalData.lastName}`
                        : "Unbekannt";

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
                                        <h3 className="text-lg font-black text-slate-900 leading-none mb-1">{displayName}</h3>
                                        <p className="text-sm text-slate-500 font-medium">{sheets.length} Stundenzettel im Archiv</p>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                            </button>

                        {/* Folder Content */}
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
                                        {sheets.map((sheet) => {
                                            const sheetKey = `${sheet.employeeId}-${sheet.month}`;
                                            const isDownloading = downloadingIds.has(sheetKey);
                                            return (
                                                <tr key={sheet.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5 font-bold text-slate-900 text-sm">
                                                        <button
                                                            onClick={() => handlePreview(sheet)}
                                                            className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left"
                                                        >
                                                            <Calendar className="h-4 w-4 text-indigo-500" />
                                                            {new Date(sheet.month).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                                                        </button>
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
                                                        <div className="flex justify-end items-center gap-2">
                                                            {/* Vorschau: opens HTML preview modal */}
                                                            <button
                                                                onClick={() => handlePreview(sheet)}
                                                                disabled={previewLoadingId === sheet.id}
                                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-[11px] hover:bg-indigo-100 transition-all"
                                                                title="Vorschau anzeigen"
                                                            >
                                                                {previewLoadingId === sheet.id
                                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    : <Eye className="h-3.5 w-3.5" />}
                                                                Vorschau
                                                            </button>
                                                            {/* Download: directly saves PDF */}
                                                            <button
                                                                onClick={() => handleDownload(sheet)}
                                                                disabled={isDownloading}
                                                                className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50"
                                                                title="PDF herunterladen"
                                                            >
                                                                {isDownloading
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Download className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            {storedPreviewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/30 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 flex items-center justify-between bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 text-white shrink-0">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">Zeitarchiv</p>
                                <h2 className="text-2xl font-black tracking-tight mt-1">{storedPreviewTitle}</h2>
                                <p className="text-sm text-white/60 font-medium mt-1">Gespeicherte PDF-Vorschau</p>
                            </div>
                            <button
                                onClick={closeStoredPreview}
                                className="h-10 w-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100">
                            <iframe
                                src={storedPreviewUrl}
                                title={storedPreviewTitle}
                                className="w-full h-full border-0"
                            />
                        </div>
                    </div>
                </div>
            )}

            <TimeTrackingPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                entries={getFilteredEntries()}
                employee={selectedEmployee}
                month={selectedMonth}
                companySettings={companySettings}
            />

            {isMonthExportOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-7 py-6 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Zeit-Archiv</p>
                                    <h3 className="mt-1 text-2xl font-black">Stundenzettel exportieren</h3>
                                    <p className="mt-2 text-sm font-medium text-white/65">Alle abgeschlossenen Mitarbeiter-PDFs eines Monats werden in einer Datei zusammengeführt.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => !isExportingMonth && setIsMonthExportOpen(false)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white disabled:opacity-50"
                                    disabled={isExportingMonth}
                                    aria-label="Export schließen"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-5 p-7">
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Monat auswählen</label>
                                <select
                                    value={exportMonth}
                                    onChange={(event) => setExportMonth(event.target.value)}
                                    disabled={isExportingMonth}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                                >
                                    {archiveMonths.map(month => (
                                        <option key={month} value={month}>{formatMonth(month)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold leading-relaxed text-indigo-900">
                                Es werden nur bereits abgeschlossene und gespeicherte Stundenzettel exportiert. Die Original-PDFs bleiben unverändert.
                            </div>
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setIsMonthExportOpen(false)}
                                    disabled={isExportingMonth}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="button"
                                    onClick={handleMonthExport}
                                    disabled={!exportMonth || isExportingMonth}
                                    className="inline-flex items-center gap-2 rounded-xl bg-primary-gradient px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isExportingMonth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    {isExportingMonth ? 'Export wird erstellt ...' : 'PDF herunterladen'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
