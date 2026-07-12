"use client";

import React, { useState } from "react";
import {
    Briefcase,
    Calendar,
    CreditCard,
    Download,
    Edit2,
    FileDown,
    FileText,
    Heart,
    Mail,
    MapPin,
    Phone,
    Plus,
    Shield,
    Trash2,
    Upload,
    UserCheck,
    UserX,
    X,
} from "lucide-react";
import { Employee, EmployeeDocument } from "@/types/employee";
import { cn } from "@/lib/utils";

interface EmployeeDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    onStartEdit?: (employee: Employee) => void;
    onDownloadPDF: (employee: Employee) => void;
    onDeactivate?: (employee: Employee) => void;
    onReactivate?: (employee: Employee) => void;
    onDelete?: (id: string) => void;
    onDeleteDocument?: (employeeId: string, docId: string) => void;
    onAddDocument?: (employeeId: string, doc: EmployeeDocument) => void;
    onPreviewDocument: (doc: EmployeeDocument) => void;
    isDownloadingPDF: boolean;
}

const formatDate = (date?: string) => {
    if (!date) return "-";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("de-AT");
};

const empty = (value?: string | number) => {
    if (value === 0) return "0";
    return value ? String(value) : "-";
};

const InfoCard = ({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>
            <h4 className="font-black text-slate-950">{title}</h4>
        </div>
        <div className="space-y-3">{children}</div>
    </div>
);

const InfoRow = ({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) => (
    <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <span className={cn("text-right text-sm font-black text-slate-800", mono && "font-mono text-xs")}>{empty(value)}</span>
    </div>
);

const DOCUMENT_TYPES = [
    { value: "id_card", label: "Ausweis" },
    { value: "passport", label: "Reisepass" },
    { value: "ecard", label: "E-Card" },
    { value: "registration", label: "Anmeldung" },
    { value: "deregistration", label: "Abmeldung" },
    { value: "sick_leave", label: "Krankmeldung" },
    { value: "contract", label: "Dienstvertrag" },
    { value: "certificate", label: "Zertifikat / Schulung" },
    { value: "other", label: "Sonstiges / eigener Typ" },
];

const formatFileSize = (size: number) =>
    size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;

const sanitizeFileName = (name: string) =>
    name
        .trim()
        .replace(/[<>:"/\\|?*]+/g, "")
        .replace(/\s+/g, "_") || "Dokument";

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
    onAddDocument,
    onPreviewDocument,
    isDownloadingPDF,
}: EmployeeDetailModalProps) {
    const [activeTab, setActiveTab] = useState<"info" | "documents">("info");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [documentType, setDocumentType] = useState("id_card");
    const [customDocumentType, setCustomDocumentType] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");

    if (!isOpen || !employee) return null;

    const name = `${employee.personalData.firstName} ${employee.personalData.lastName}`.trim() || "Unbenannter Mitarbeiter";
    const initials =
        name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?";
    const isActive = employee.employment.isActive !== false;
    const docs = employee.documents || [];
    const weeklyHours = employee.weeklySchedule
        ? Object.values(employee.weeklySchedule).reduce((sum, day) => sum + (day.enabled ? Number(day.hours || 0) : 0), 0)
        : 0;

    const selectedTypeLabel =
        documentType === "other"
            ? customDocumentType.trim() || "Eigenes Dokument"
            : DOCUMENT_TYPES.find((type) => type.value === documentType)?.label || "Dokument";

    const handleFileSelection = (file?: File | null) => {
        if (!file) return;
        const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
        setSelectedFile(file);
        setFileName(`${sanitizeFileName(selectedTypeLabel)}_${employee.personalData.lastName || "Mitarbeiter"}${extension ? `.${extension}` : ""}`);
    };

    const resetUpload = () => {
        setIsUploadOpen(false);
        setDocumentType("id_card");
        setCustomDocumentType("");
        setSelectedFile(null);
        setFileName("");
    };

    const handleUploadDocument = () => {
        if (!selectedFile || !onAddDocument) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const document: EmployeeDocument = {
                id: Math.random().toString(36).substr(2, 9),
                name: fileName.trim() || selectedFile.name,
                type: selectedFile.type || "application/octet-stream",
                uploadDate: new Date().toISOString(),
                fileSize: formatFileSize(selectedFile.size),
                content: reader.result as string,
                category: "upload",
                subType: documentType === "other" ? sanitizeFileName(customDocumentType).toLowerCase() : documentType,
            };

            onAddDocument(employee.id, document);
            resetUpload();
        };
        reader.readAsDataURL(selectedFile);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-[92rem] overflow-hidden rounded-[34px] border border-white bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
                <aside className="hidden w-96 shrink-0 flex-col justify-between bg-gradient-to-br from-indigo-800 via-violet-800 to-fuchsia-600 p-8 text-white lg:flex">
                    <div>
                        {employee.avatar ? (
                            <div className="mb-6 h-24 w-24 overflow-hidden rounded-3xl border border-white/20 bg-white shadow-xl">
                                <img src={employee.avatar} alt={name} className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-3xl font-black text-indigo-700 shadow-xl">
                                {initials}
                            </div>
                        )}

                        <div className="mb-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ring-white/15">
                                #{employee.employeeNumber || "---"}
                            </span>
                            <span className={cn(
                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ring-1",
                                isActive ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/20" : "bg-rose-400/15 text-rose-100 ring-rose-300/20"
                            )}>
                                {isActive ? "Aktiv" : "Archiviert"}
                            </span>
                        </div>

                        <h3 className="text-3xl font-black leading-tight">{name}</h3>
                        <p className="mt-2 text-sm font-semibold text-white/70">
                            {employee.employment.position || "Keine Position"} · {employee.employment.status}
                        </p>

                        <div className="mt-8 space-y-5 border-t border-white/15 pt-6">
                            <a href={employee.personalData.email ? `mailto:${employee.personalData.email}` : undefined} className="flex min-w-0 items-center gap-3 text-sm font-bold text-white/80">
                                <Mail className="h-4 w-4 shrink-0 text-cyan-100" />
                                <span className="truncate">{employee.personalData.email || "Keine E-Mail"}</span>
                            </a>
                            <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-white/80">
                                <Phone className="h-4 w-4 shrink-0 text-cyan-100" />
                                <span className="truncate">{employee.personalData.phone || "Keine Telefonnummer"}</span>
                            </div>
                            <div className="flex items-start gap-3 text-sm font-bold leading-6 text-white/80">
                                <MapPin className="mt-1 h-4 w-4 shrink-0 text-cyan-100" />
                                <span>{employee.personalData.street || "-"}<br />{employee.personalData.zip || ""} {employee.personalData.city || ""}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/55">
                            <span>Eintritt</span>
                            <span>{formatDate(employee.employment.startDate)}</span>
                        </div>
                        {employee.employment.endDate && (
                            <div className="mt-3 flex justify-between text-xs font-black uppercase tracking-widest text-rose-100">
                                <span>Austritt</span>
                                <span>{formatDate(employee.employment.endDate)}</span>
                            </div>
                        )}
                    </div>
                </aside>

                <section className="flex min-w-0 flex-1 flex-col">
                    <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Personalakte</p>
                            <h3 className="mt-1 truncate text-2xl font-black text-slate-950">{name}</h3>
                            <p className="mt-1 text-sm font-bold text-slate-500 lg:hidden">#{employee.employeeNumber || "---"} · {employee.employment.position || "Keine Position"}</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onDownloadPDF(employee)}
                                disabled={isDownloadingPDF}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                                title="Personaldatenblatt herunterladen"
                            >
                                {isDownloadingPDF ? <FileDown className="h-4 w-4 animate-pulse" /> : <FileDown className="h-4 w-4" />}
                            </button>
                            {onStartEdit && (
                                <button
                                    onClick={() => onStartEdit(employee)}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                                    title="Bearbeiten"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            )}
                            {isActive ? (
                                onDeactivate && (
                                    <button
                                        onClick={() => onDeactivate(employee)}
                                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                        title="Abmelden"
                                    >
                                        <UserX className="h-4 w-4" />
                                    </button>
                                )
                            ) : (
                                <>
                                    {onReactivate && (
                                        <button
                                            onClick={() => onReactivate(employee)}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                                            title="Reaktivieren"
                                        >
                                            <UserCheck className="h-4 w-4" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(employee.id)}
                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                            title="Endgültig löschen"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Schließen"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </header>

                    <div className="border-b border-slate-100 px-6 py-4 sm:px-8">
                        <div className="flex rounded-2xl bg-slate-100 p-1">
                            <button
                                onClick={() => setActiveTab("info")}
                                className={cn(
                                    "flex-1 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition",
                                    activeTab === "info" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Allgemeine Infos
                            </button>
                            <button
                                onClick={() => setActiveTab("documents")}
                                className={cn(
                                    "flex-1 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition",
                                    activeTab === "documents" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Dokumente ({docs.length})
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-8">
                        {activeTab === "info" ? (
                            <div className="grid gap-4 xl:grid-cols-2">
                                <InfoCard icon={Shield} title="Stammdaten & Sozialversicherung">
                                    <InfoRow label="SV-Nummer" value={employee.personalData.socialSecurityNumber} />
                                    <InfoRow label="Geburtsdatum" value={formatDate(employee.personalData.birthday)} />
                                    <InfoRow label="Geburtsort" value={`${employee.personalData.birthPlace || "-"}${employee.personalData.birthCountry ? `, ${employee.personalData.birthCountry}` : ""}`} />
                                    <InfoRow label="Staatsbürgerschaft" value={employee.personalData.nationality} />
                                </InfoCard>

                                <InfoCard icon={Briefcase} title="Anstellung & Konditionen">
                                    <InfoRow label="Gehalt / Lohn" value={employee.employment.salary} />
                                    <InfoRow label="Einstufung" value={employee.employment.classification} />
                                    <InfoRow label="Verwendung" value={employee.employment.verwendung} />
                                    <InfoRow label="Urlaub" value={`${employee.employment.annualLeave ?? 25} Tage / Jahr`} />
                                </InfoCard>

                                <InfoCard icon={Calendar} title="Zeiteinteilung">
                                    <InfoRow label="Wochenstunden" value={weeklyHours ? `${weeklyHours} Stunden` : "Nicht hinterlegt"} />
                                    <InfoRow label="Zeiterfassung" value={employee.additionalInfo?.noTimeTrackingRequired ? "Nicht nötig" : "Aktiv"} />
                                    <InfoRow label="Arbeitsverhältnis" value={employee.employment.workerType} />
                                    <InfoRow label="Status" value={isActive ? "Aktiv" : "Archiviert"} />
                                </InfoCard>

                                <InfoCard icon={CreditCard} title="Bankverbindung">
                                    <InfoRow label="Bankinstitut" value={employee.bankDetails.bankName} />
                                    <InfoRow label="IBAN" value={employee.bankDetails.iban} mono />
                                    <InfoRow label="BIC" value={employee.bankDetails.bic} mono />
                                </InfoCard>

                                <div className="xl:col-span-2">
                                    <InfoCard icon={Heart} title="Notfallkontakt & Notizen">
                                        <InfoRow label="Notfallkontakt" value={employee.additionalInfo?.emergencyContactName} />
                                        <InfoRow label="Telefon" value={employee.additionalInfo?.emergencyContactPhone} />
                                        <div className="border-t border-slate-100 pt-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notizen</p>
                                            <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                                                {employee.additionalInfo?.notes || "Keine Notizen hinterlegt."}
                                            </p>
                                        </div>
                                    </InfoCard>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Dokumentenablage</p>
                                        <h4 className="mt-1 text-lg font-black text-slate-950">Dokumente hochladen und verwalten</h4>
                                    </div>
                                    {onAddDocument && (
                                        <button
                                            type="button"
                                            onClick={() => setIsUploadOpen(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Dokument hochladen
                                        </button>
                                    )}
                                </div>

                                {docs.length === 0 ? (
                                    <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-center">
                                        <FileText className="mb-4 h-12 w-12 text-slate-200" />
                                        <h4 className="font-black text-slate-950">Keine Dokumente</h4>
                                        <p className="mt-2 text-sm font-semibold text-slate-500">Für diesen Mitarbeiter wurden noch keine Dokumente hinterlegt.</p>
                                    </div>
                                ) : (
                                    docs.map((doc) => (
                                        <button
                                            key={doc.id}
                                            onClick={() => onPreviewDocument(doc)}
                                            className="group flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/70"
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className={cn(
                                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                                                    doc.category === "system" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                                                )}>
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-black text-slate-950 group-hover:text-indigo-700">{doc.name}</p>
                                                    <p className="mt-1 text-xs font-bold text-slate-400">
                                                        {doc.category === "system" ? "System" : "Upload"} · {formatDate(doc.uploadDate)} · {doc.fileSize || "-"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 gap-2" onClick={(event) => event.stopPropagation()}>
                                                <button
                                                    onClick={() => {
                                                        if (!doc.content) return;
                                                        const link = document.createElement("a");
                                                        link.href = doc.content;
                                                        link.download = doc.name;
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                                    title="Download"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                {onDeleteDocument && (
                                                    <button
                                                        onClick={() => onDeleteDocument(employee.id, doc.id)}
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-100 hover:text-rose-700"
                                                        title="Löschen"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {isUploadOpen && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl rounded-[32px] border border-white bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500">Upload</p>
                                <h3 className="mt-1 text-2xl font-black text-slate-950">Dokument hinzufügen</h3>
                                <p className="mt-2 text-sm font-semibold text-slate-500">Typ wählen, Datei auswählen, Namen kontrollieren und hochladen.</p>
                            </div>
                            <button
                                type="button"
                                onClick={resetUpload}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dokumentart</span>
                                <select
                                    value={documentType}
                                    onChange={(event) => {
                                        setDocumentType(event.target.value);
                                        setSelectedFile(null);
                                        setFileName("");
                                    }}
                                    className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                >
                                    {DOCUMENT_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </label>

                            {documentType === "other" && (
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eigene Bezeichnung</span>
                                    <input
                                        value={customDocumentType}
                                        onChange={(event) => {
                                            setCustomDocumentType(event.target.value);
                                            setSelectedFile(null);
                                            setFileName("");
                                        }}
                                        placeholder="z.B. Schulungsnachweis"
                                        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                    />
                                </label>
                            )}

                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-8 text-center transition hover:bg-indigo-50">
                                <Upload className="mb-3 h-8 w-8 text-indigo-500" />
                                <span className="font-black text-slate-950">{selectedFile ? selectedFile.name : "Datei vom Computer auswählen"}</span>
                                <span className="mt-1 text-sm font-semibold text-slate-500">{selectedFile ? formatFileSize(selectedFile.size) : "PDF, Bild oder anderes Dokument"}</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(event) => handleFileSelection(event.target.files?.[0])}
                                />
                            </label>

                            {selectedFile && (
                                <label className="block">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dateiname vor dem Hochladen</span>
                                    <input
                                        value={fileName}
                                        onChange={(event) => setFileName(event.target.value)}
                                        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={resetUpload}
                                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                onClick={handleUploadDocument}
                                disabled={!selectedFile || (documentType === "other" && !customDocumentType.trim())}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Hochladen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
