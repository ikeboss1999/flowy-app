"use client";

import React, { useState } from "react";
import { X, User, Briefcase, Mail, Phone, MapPin, CreditCard, FileText, Calendar, DollarSign, Download, Eye, Trash2, Edit2, Loader2, Shield, Heart, FileDown, UserX, UserCheck, Folder, ExternalLink } from "lucide-react";
import { Employee, EmployeeDocument } from "@/types/employee";
import { cn } from "@/lib/utils";

interface EmployeeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    onStartEdit: (employee: Employee) => void;
    onDownloadPDF: (employee: Employee) => void;
    onDeactivate: (employee: Employee) => void;
    onReactivate: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onDeleteDocument: (employeeId: string, docId: string) => void;
    onPreviewDocument: (doc: EmployeeDocument) => void;
    isDownloadingPDF: boolean;
}

export function EmployeeDetailModal({
    isOpen,
    onClose,
    employee,
    onStartEdit,
    onDownloadPDF,
    onDeactivate,
    onReactivate,
    onDelete,
    onDeleteDocument,
    onPreviewDocument,
    isDownloadingPDF
}: EmployeeDetailModalProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');

    if (!isOpen || !employee) return null;

    const name = `${employee.personalData.firstName} ${employee.personalData.lastName}`;
    
    // Generate initials for avatar
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    const isActive = employee.employment.isActive !== false;

    // Group documents by category or folder
    const docs = employee.documents || [];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-[88rem] rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row max-h-[95vh] md:max-h-[900px] animate-in zoom-in-95 duration-200">
                
                {/* Linkes Panel (Hero & Kontakt) - 30% Breite, Farbverlauf */}
                <div className="md:w-[30%] bg-gradient-to-br from-[#1e1b4b] via-[#3b0764] to-[#4f46e5] text-slate-100 border-r border-white/5 p-8 flex flex-col justify-between relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 left-6 md:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white shadow-sm border border-white/10 bg-white/5"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="space-y-8 mt-4 md:mt-0">
                        {/* Profile Avatar & Name */}
                        <div className="space-y-4">
                            {employee.avatar ? (
                                <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg border-2 border-white/10 ring-4 ring-white/5 bg-white">
                                    <img src={employee.avatar} alt={name} className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-2xl bg-white text-slate-800 font-black text-xl flex items-center justify-center shadow-lg">
                                    {initials}
                                </div>
                            )}
                            <div>
                                <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest block mb-1">
                                    #{employee.employeeNumber || "---"} • {employee.employment.workerType}
                                </span>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-snug break-words">
                                    {name}
                                </h3>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/15">
                                {employee.employment.status}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/15">
                                {employee.employment.position || "Keine Position"}
                            </span>
                            {isActive ? (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-350 border border-emerald-500/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Aktiv
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-355 border border-rose-500/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-450" />
                                    Inaktiv
                                </span>
                            )}
                        </div>

                        <hr className="border-white/10" />

                        {/* Quick Contacts */}
                        <div className="space-y-5">
                            <div>
                                <span className="text-[9px] font-bold text-slate-350 uppercase tracking-widest block mb-1.5">E-Mail-Adresse</span>
                                <div className="flex items-center gap-2 text-slate-200 justify-between">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <Mail className="h-4.5 w-4.5 text-slate-355 shrink-0" />
                                        <span className="text-sm font-semibold truncate" title={employee.personalData.email}>{employee.personalData.email || "-"}</span>
                                    </div>
                                    {employee.personalData.email && (
                                        <a
                                            href={`mailto:${employee.personalData.email}`}
                                            className="p-1 text-slate-355 hover:text-white rounded-md hover:bg-white/10 transition-colors shrink-0"
                                            title="E-Mail schreiben"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span className="text-[9px] font-bold text-slate-355 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
                                <div className="flex items-center gap-2.5 text-slate-200">
                                    <Phone className="h-4.5 w-4.5 text-slate-355 shrink-0" />
                                    <span className="text-sm font-semibold">{employee.personalData.phone || "-"}</span>
                                </div>
                            </div>

                            <div>
                                <span className="text-[9px] font-bold text-slate-355 uppercase tracking-widest block mb-1.5">Anschrift</span>
                                <div className="flex items-start gap-2.5 text-slate-200">
                                    <MapPin className="h-4.5 w-4.5 text-slate-355 mt-0.5 shrink-0" />
                                    <div className="text-sm font-semibold leading-relaxed">
                                        <p>{employee.personalData.street || "-"}</p>
                                        <p>{employee.personalData.zip || ""} {employee.personalData.city || ""}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata am Fuß */}
                    <div className="pt-6 border-t border-white/10 hidden md:block">
                        <div className="space-y-2 text-[11px] font-semibold text-slate-355">
                            <div className="flex justify-between">
                                <span>Eintrittsdatum:</span>
                                <span className="text-slate-200">{employee.employment.startDate ? new Date(employee.employment.startDate).toLocaleDateString('de-DE') : "-"}</span>
                            </div>
                            {employee.employment.endDate && (
                                <div className="flex justify-between">
                                    <span>Austrittsdatum:</span>
                                    <span className="text-rose-300">{new Date(employee.employment.endDate).toLocaleDateString('de-DE')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rechtes Panel (Detaillierte Infos) - 70% Breite */}
                <div className="flex-1 p-8 flex flex-col justify-between overflow-y-auto relative bg-white">
                    {/* Actions Header */}
                    <div className="absolute top-6 right-6 hidden md:flex items-center gap-2">
                        <button
                            onClick={() => onDownloadPDF(employee)}
                            disabled={isDownloadingPDF}
                            className="p-2 border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/50 rounded-xl transition-all"
                            title="Personaldatenblatt herunterladen"
                        >
                            {isDownloadingPDF ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="h-4 w-4" />
                            )}
                        </button>
                        <button
                            onClick={() => onStartEdit(employee)}
                            className="p-2 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 rounded-xl transition-all"
                            title="Bearbeiten"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        {isActive ? (
                            <button
                                onClick={() => onDeactivate(employee)}
                                className="p-2 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/50 rounded-xl transition-all"
                                title="Abmelden (Archivieren)"
                            >
                                <UserX className="h-4 w-4" />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => onReactivate(employee)}
                                    className="p-2 border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/50 rounded-xl transition-all"
                                    title="Reaktivieren (Wieder anmelden)"
                                >
                                    <UserCheck className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(employee.id)}
                                    className="p-2 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/50 rounded-xl transition-all"
                                    title="Endgültig löschen"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all ml-2">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-2 border-b border-slate-100 pb-4 shrink-0 mt-8 md:mt-2">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wider font-outfit border shadow-sm",
                                activeTab === 'info'
                                    ? "bg-gradient-to-r from-[#3b0764] to-[#4f46e5] text-white border-transparent shadow-indigo-500/10"
                                    : "bg-slate-50 text-slate-450 border-slate-100 hover:text-slate-700 hover:bg-slate-100"
                            )}
                        >
                            Allgemeine Infos
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl font-bold text-xs transition-all uppercase tracking-wider font-outfit border flex items-center gap-1.5 shadow-sm",
                                activeTab === 'documents'
                                    ? "bg-gradient-to-r from-[#3b0764] to-[#4f46e5] text-white border-transparent shadow-indigo-500/10"
                                    : "bg-slate-50 text-slate-450 border-slate-100 hover:text-slate-700 hover:bg-slate-100"
                            )}
                        >
                            Dokumente
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[9px] font-black leading-none",
                                activeTab === 'documents' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                            )}>
                                {docs.length}
                            </span>
                        </button>
                    </div>

                    {/* Content Bereich */}
                    <div className="flex-1 flex flex-col justify-between pt-4 overflow-y-auto">
                        
                        {/* Tab 1: Allgemeine Infos */}
                        {activeTab === 'info' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-205">
                                
                                {/* Card 1: Stammdaten & SV */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5" /> Stammdaten & Sozialversicherung
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[140px] space-y-3 flex flex-col justify-center">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">SV-Nummer:</span>
                                            <span className="font-bold text-slate-800">{employee.personalData.socialSecurityNumber || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Geburtsdatum:</span>
                                            <span className="font-bold text-slate-800">
                                                {employee.personalData.birthday ? new Date(employee.personalData.birthday).toLocaleDateString('de-DE') : '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Geburtsort:</span>
                                            <span className="font-bold text-slate-800">
                                                {employee.personalData.birthPlace || '—'}{employee.personalData.birthCountry ? `, ${employee.personalData.birthCountry}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Staatsbürgerschaft:</span>
                                            <span className="font-bold text-slate-800">{employee.personalData.nationality || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Anstellung & Konditionen */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5" /> Anstellung & Konditionen
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[140px] space-y-3 flex flex-col justify-center">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Gehalt / Lohn:</span>
                                            <span className="font-bold text-slate-800">{employee.employment.salary || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Einstufung / Verwendung:</span>
                                            <span className="font-bold text-slate-800">
                                                {employee.employment.classification || '—'} {employee.employment.verwendung ? `/ ${employee.employment.verwendung}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Wochenstunden:</span>
                                            <span className="font-bold text-slate-800">{employee.weeklySchedule ? "Regelmäßig (Zeiteinteilung)" : "Standard"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Urlaubsausmaß:</span>
                                            <span className="font-bold text-slate-800">{employee.employment.annualLeave ?? 25} Tage / Jahr</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Bankdaten */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5" /> Bankverbindung
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[120px] space-y-3 flex flex-col justify-center">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Bankinstitut:</span>
                                            <span className="font-bold text-slate-800">{employee.bankDetails.bankName || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">IBAN:</span>
                                            <span className="font-bold text-slate-800 font-mono text-[11px]">{employee.bankDetails.iban || '—'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">BIC:</span>
                                            <span className="font-bold text-slate-800 font-mono text-[11px]">{employee.bankDetails.bic || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: Notfallkontakt & Notizen */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <Heart className="h-3.5 w-3.5" /> Kontakt & Notizen
                                    </h4>
                                    <div className="bg-slate-50/40 border border-slate-100/80 rounded-2xl p-5 min-h-[120px] space-y-3 flex flex-col justify-center">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider">Notfallkontakt:</span>
                                            <span className="font-bold text-slate-850">
                                                {employee.additionalInfo?.emergencyContactName || '—'} {employee.additionalInfo?.emergencyContactPhone ? `(${employee.additionalInfo.emergencyContactPhone})` : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start text-xs border-t border-slate-100/50 pt-2.5">
                                            <span className="font-bold text-slate-450 uppercase tracking-wider shrink-0 mr-4">Notizen:</span>
                                            <span className="font-semibold text-slate-650 text-right leading-normal line-clamp-3">
                                                {employee.additionalInfo?.notes || 'Keine Notizen hinterlegt.'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* Tab 2: Dokumente */}
                        {activeTab === 'documents' && (
                            <div className="space-y-4 animate-in fade-in duration-200 flex-1 flex flex-col">
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                        <FileText className="h-4 w-4" /> Dokumenten-Archiv des Mitarbeiters ({docs.length})
                                    </h4>

                                    {docs.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl p-12 text-center text-slate-400 min-h-[250px]">
                                            <Folder className="h-12 w-12 text-slate-200 mb-3" />
                                            <p className="text-xs font-bold font-outfit">Keine Dokumente</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-1">Es wurden noch keine Dokumente für diesen Mitarbeiter hinterlegt.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                                            {docs.map(doc => (
                                                <div 
                                                    key={doc.id} 
                                                    onClick={() => onPreviewDocument(doc)}
                                                    className="flex items-center justify-between p-3.5 px-4 bg-slate-50/50 hover:bg-indigo-50/20 border border-slate-100/70 rounded-2xl hover:border-indigo-150 transition-all duration-150 cursor-pointer group/doc"
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors",
                                                            doc.category === 'system' 
                                                                ? "bg-emerald-50 text-emerald-650 border-emerald-100 group-hover/doc:bg-emerald-100 group-hover/doc:text-emerald-700" 
                                                                : "bg-indigo-50 text-indigo-650 border-indigo-100 group-hover/doc:bg-indigo-100 group-hover/doc:text-indigo-750"
                                                        )}>
                                                            <FileText className="h-4.5 w-4.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-750 truncate group-hover/doc:text-indigo-650 transition-colors" title={doc.name}>
                                                                {doc.name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider flex items-center gap-1.5">
                                                                <span>{doc.category === 'system' ? 'System' : 'Upload'}</span>
                                                                <span>•</span>
                                                                <span>{doc.fileSize || "—"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5 shrink-0 ml-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (doc.content) {
                                                                    const link = document.createElement('a');
                                                                    link.href = doc.content;
                                                                    link.download = doc.name;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-450 hover:text-slate-800 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100/50 shadow-sm bg-white"
                                                            title="Download"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteDocument(employee.id, doc.id);
                                                            }}
                                                            className="p-1.5 text-slate-450 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100/50 shadow-sm bg-white"
                                                            title="Löschen"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Close Button */}
                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-primary-gradient text-white rounded-xl font-bold hover:opacity-95 transition-all text-xs tracking-wide shadow-md shadow-purple-500/20 active:scale-95 duration-150"
                        >
                            Schließen
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
