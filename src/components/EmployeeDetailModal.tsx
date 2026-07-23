"use client";

import React, { useEffect, useState } from "react";
import {
    Briefcase,
    Calendar,
    Copy,
    CreditCard,
    Download,
    Edit2,
    FileDown,
    FileText,
    Folder,
    Heart,
    KeyRound,
    Loader2,
    Mail,
    MapPin,
    Phone,
    Plus,
    Shield,
    Smartphone,
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
    onUpdateEmployee?: (employee: Employee) => void;
    onMobileAccessAction?: (
        employeeId: string,
        action:
            | { action: "enable" }
            | { action: "disable" }
            | { action: "generateActivationCode" }
            | { action: "revokeActivationCode" }
            | {
                action: "updatePermissions";
                permissions: {
                    timeTracking: boolean;
                    documents: boolean;
                    projectDiary: boolean;
                };
            }
    ) => Promise<{ activationCode?: string; activationCodeExpiresAt?: string } | void>;
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

interface MobileDocumentFolder {
    id: string;
    name: string;
    sortOrder?: number;
}

interface MobileDocument {
    id: string;
    folderId?: string | null;
    name: string;
    mimeType: string;
    fileSize: number;
    isShared: boolean;
    createdAt: string;
}

interface MobileProjectOption {
    id: string;
    projectNumber?: string;
    name: string;
    description?: string;
    status: string;
    address?: {
        street?: string;
        city?: string;
        zip?: string;
    };
}

interface MobileProjectAssignment {
    id: string;
    projectId: string;
    employeeId: string;
    task?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status: string;
    project?: MobileProjectOption | null;
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
    onAddDocument,
    onUpdateEmployee,
    onMobileAccessAction,
    onPreviewDocument,
    isDownloadingPDF,
}: EmployeeDetailModalProps) {
    const [activeTab, setActiveTab] = useState<"info" | "documents" | "mobile">("info");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [documentType, setDocumentType] = useState("id_card");
    const [customDocumentType, setCustomDocumentType] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");
    const [isMobileActionLoading, setIsMobileActionLoading] = useState(false);
    const [activationCode, setActivationCode] = useState<string | null>(null);
    const [activationCodeExpiresAt, setActivationCodeExpiresAt] = useState<string | null>(null);
    const [mobileFolders, setMobileFolders] = useState<MobileDocumentFolder[]>([]);
    const [mobileDocuments, setMobileDocuments] = useState<MobileDocument[]>([]);
    const [isMobileDocumentsLoading, setIsMobileDocumentsLoading] = useState(false);
    const [mobileDocumentsError, setMobileDocumentsError] = useState<string | null>(null);
    const [newMobileFolderName, setNewMobileFolderName] = useState("");
    const [mobileUploadFile, setMobileUploadFile] = useState<File | null>(null);
    const [mobileUploadFolderId, setMobileUploadFolderId] = useState("");
    const [mobileUploadName, setMobileUploadName] = useState("");
    const [mobileProjects, setMobileProjects] = useState<MobileProjectOption[]>([]);
    const [mobileProjectAssignments, setMobileProjectAssignments] = useState<MobileProjectAssignment[]>([]);
    const [isMobileProjectsLoading, setIsMobileProjectsLoading] = useState(false);
    const [mobileProjectsError, setMobileProjectsError] = useState<string | null>(null);
    const [selectedMobileProjectId, setSelectedMobileProjectId] = useState("");
    const [mobileProjectTask, setMobileProjectTask] = useState("");
    const [maxMobileProjectAssignments, setMaxMobileProjectAssignments] = useState(2);

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
    const appAccess = employee.appAccess;
    const sharedLegacyDocs = docs.filter((doc) => doc.isShared).length;
    const appPermissions: Array<{ key: "timeTracking" | "documents" | "projectDiary"; label: string; description: string; enabled?: boolean }> = [
        { key: "timeTracking", label: "Zeiterfassung", description: "Zeiten-Tab, Tagesstatus und Monatsabgabe", enabled: appAccess?.permissions?.timeTracking },
        { key: "projectDiary", label: "Projekte & Bautagebuch", description: "Zugewiesene Projekte, Route, Notizen und Fotos", enabled: appAccess?.permissions?.projectDiary },
        { key: "documents", label: "Dokumente", description: "Freigegebene Mitarbeiterdokumente und Downloads", enabled: appAccess?.permissions?.documents },
    ];
    const assignedMobileProjectIds = new Set(mobileProjectAssignments.map((assignment) => assignment.projectId));
    const assignableMobileProjects = mobileProjects.filter((project) => !assignedMobileProjectIds.has(project.id));
    const weeklyHours = employee.weeklySchedule
        ? Object.values(employee.weeklySchedule).reduce((sum, day) => sum + (day.enabled ? Number(day.hours || 0) : 0), 0)
        : 0;

    const selectedTypeLabel =
        documentType === "other"
            ? customDocumentType.trim() || "Eigenes Dokument"
            : DOCUMENT_TYPES.find((type) => type.value === documentType)?.label || "Dokument";

    const loadMobileDocuments = async () => {
        setIsMobileDocumentsLoading(true);
        setMobileDocumentsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-documents`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Mobile-Dokumente konnten nicht geladen werden.");
            setMobileFolders(data.folders || []);
            setMobileDocuments(data.documents || []);
        } catch (error: any) {
            setMobileDocumentsError(error?.message || "Mobile-Dokumente konnten nicht geladen werden.");
        } finally {
            setIsMobileDocumentsLoading(false);
        }
    };

    const loadMobileProjects = async () => {
        setIsMobileProjectsLoading(true);
        setMobileProjectsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-projects`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Mobile-Projekte konnten nicht geladen werden.");
            setMobileProjects(data.projects || []);
            setMobileProjectAssignments(data.assignments || []);
            setMaxMobileProjectAssignments(data.maxActiveAssignments || 2);
        } catch (error: any) {
            setMobileProjectsError(error?.message || "Mobile-Projekte konnten nicht geladen werden.");
        } finally {
            setIsMobileProjectsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "mobile") {
            loadMobileDocuments();
            loadMobileProjects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, employee.id]);

    const assignMobileProject = async () => {
        if (!selectedMobileProjectId) return;
        setIsMobileProjectsLoading(true);
        setMobileProjectsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: selectedMobileProjectId,
                    task: mobileProjectTask.trim() || undefined,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Projekt konnte nicht zugeordnet werden.");
            setSelectedMobileProjectId("");
            setMobileProjectTask("");
            await loadMobileProjects();
        } catch (error: any) {
            setMobileProjectsError(error?.message || "Projekt konnte nicht zugeordnet werden.");
        } finally {
            setIsMobileProjectsLoading(false);
        }
    };

    const removeMobileProjectAssignment = async (assignmentId: string) => {
        setIsMobileProjectsLoading(true);
        setMobileProjectsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-projects?id=${encodeURIComponent(assignmentId)}`, {
                method: "DELETE",
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Projektzuordnung konnte nicht entfernt werden.");
            await loadMobileProjects();
        } catch (error: any) {
            setMobileProjectsError(error?.message || "Projektzuordnung konnte nicht entfernt werden.");
        } finally {
            setIsMobileProjectsLoading(false);
        }
    };


    const createMobileFolder = async () => {
        const name = newMobileFolderName.trim();
        if (!name) return;
        setIsMobileDocumentsLoading(true);
        setMobileDocumentsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "folder", name }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Ordner konnte nicht erstellt werden.");
            setNewMobileFolderName("");
            await loadMobileDocuments();
        } catch (error: any) {
            setMobileDocumentsError(error?.message || "Ordner konnte nicht erstellt werden.");
        } finally {
            setIsMobileDocumentsLoading(false);
        }
    };

    const uploadMobileDocument = async () => {
        if (!mobileUploadFile) return;
        setIsMobileDocumentsLoading(true);
        setMobileDocumentsError(null);
        try {
            const formData = new FormData();
            formData.append("file", mobileUploadFile);
            formData.append("name", mobileUploadName.trim() || mobileUploadFile.name);
            formData.append("folderId", mobileUploadFolderId);
            formData.append("isShared", "true");

            const response = await fetch(`/api/employees/${employee.id}/mobile-documents`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Dokument konnte nicht hochgeladen werden.");
            setMobileUploadFile(null);
            setMobileUploadFolderId("");
            setMobileUploadName("");
            await loadMobileDocuments();
        } catch (error: any) {
            setMobileDocumentsError(error?.message || "Dokument konnte nicht hochgeladen werden.");
        } finally {
            setIsMobileDocumentsLoading(false);
        }
    };

    const deleteMobileDocument = async (id: string) => {
        setIsMobileDocumentsLoading(true);
        setMobileDocumentsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-documents?type=document&id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Dokument konnte nicht geloescht werden.");
            await loadMobileDocuments();
        } catch (error: any) {
            setMobileDocumentsError(error?.message || "Dokument konnte nicht geloescht werden.");
        } finally {
            setIsMobileDocumentsLoading(false);
        }
    };

    const deleteMobileFolder = async (id: string) => {
        setIsMobileDocumentsLoading(true);
        setMobileDocumentsError(null);
        try {
            const response = await fetch(`/api/employees/${employee.id}/mobile-documents?type=folder&id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Ordner konnte nicht geloescht werden.");
            await loadMobileDocuments();
        } catch (error: any) {
            setMobileDocumentsError(error?.message || "Ordner konnte nicht geloescht werden.");
        } finally {
            setIsMobileDocumentsLoading(false);
        }
    };

    const runMobileAccessAction = async (
        action:
            | { action: "enable" }
            | { action: "disable" }
            | { action: "generateActivationCode" }
            | { action: "revokeActivationCode" }
            | {
                action: "updatePermissions";
                permissions: {
                    timeTracking: boolean;
                    documents: boolean;
                    projectDiary: boolean;
                };
            }
    ) => {
        if (!onMobileAccessAction || isMobileActionLoading) return;
        setIsMobileActionLoading(true);
        try {
            const result = await onMobileAccessAction(employee.id, action);
            if (result?.activationCode) {
                setActivationCode(result.activationCode);
                setActivationCodeExpiresAt(result.activationCodeExpiresAt || null);
            }
            if (action.action === "revokeActivationCode") {
                setActivationCode(null);
                setActivationCodeExpiresAt(null);
            }
        } finally {
            setIsMobileActionLoading(false);
        }
    };

    const toggleMobileAccess = () => {
        runMobileAccessAction({ action: appAccess?.isAccessEnabled ? "disable" : "enable" });
    };

    const togglePermission = (key: "timeTracking" | "documents" | "projectDiary") => {
        if (!onMobileAccessAction) return;
        const currentPermissions = {
            timeTracking: appAccess?.permissions?.timeTracking ?? true,
            documents: appAccess?.permissions?.documents ?? false,
            projectDiary: appAccess?.permissions?.projectDiary ?? false,
        };
        runMobileAccessAction({
            action: "updatePermissions",
            permissions: {
                ...currentPermissions,
                [key]: !currentPermissions[key],
            },
        });
    };

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
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-white/30 p-4">
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/20 bg-white shadow-2xl">
                <aside className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
                    <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
                    <div className="absolute right-6 top-6 z-10">
                        <button
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white"
                            aria-label="Schließen"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="relative flex flex-col gap-6 pr-14 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                            {(employee.avatarUrl || employee.avatar) ? (
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-xl">
                                    <img src={employee.avatarUrl || employee.avatar} alt={name} className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-white text-3xl font-black text-indigo-700 shadow-xl">
                                    {initials}
                                </div>
                            )}

                            <div className="min-w-0">
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
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/45">Personalakte</p>
                                <h3 className="mt-2 max-w-3xl break-words text-4xl font-black leading-tight tracking-tight">{name}</h3>
                                <p className="mt-2 text-sm font-semibold text-white/70">
                                    {employee.employment.position || "Keine Position"} · {employee.employment.status}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-white/70">
                                    <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 text-cyan-100" />{employee.personalData.email || "Keine E-Mail"}</span>
                                    <span className="flex min-w-0 items-center gap-2"><Phone className="h-4 w-4 text-cyan-100" />{employee.personalData.phone || "Keine Telefonnummer"}</span>
                                    <span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 text-cyan-100" />{employee.personalData.street || "-"}, {employee.personalData.zip || ""} {employee.personalData.city || ""}</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button
                                onClick={() => onDownloadPDF(employee)}
                                disabled={isDownloadingPDF}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:bg-indigo-50 disabled:opacity-50"
                            >
                                {isDownloadingPDF ? <FileDown className="h-4 w-4 animate-pulse" /> : <FileDown className="h-4 w-4" />}
                                PDF
                            </button>
                            {onStartEdit && (
                                <button
                                    onClick={() => onStartEdit(employee)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:bg-indigo-50"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Bearbeiten
                                </button>
                            )}
                            {isActive ? (
                                onDeactivate && (
                                    <button
                                        onClick={() => onDeactivate(employee)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/20 bg-white/10 px-5 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20"
                                    >
                                        <UserX className="h-4 w-4" />
                                        Abmelden
                                    </button>
                                )
                            ) : (
                                <>
                                    {onReactivate && (
                                        <button
                                            onClick={() => onReactivate(employee)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/20 bg-white/10 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20"
                                        >
                                            <UserCheck className="h-4 w-4" />
                                            Aktivieren
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(employee.id)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/20 bg-white/10 px-5 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Löschen
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </aside>

                <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <header className="hidden">
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
                            <button
                                onClick={() => setActiveTab("mobile")}
                                className={cn(
                                    "flex-1 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition",
                                    activeTab === "mobile" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                Mobile App
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
                        ) : activeTab === "documents" ? (
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
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                <Smartphone className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Mobile App</p>
                                                <h4 className="mt-1 text-xl font-black text-slate-950">Mitarbeiterzugriff verwalten</h4>
                                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                                    Aktivieren Sie den mobilen Zugang und legen Sie fest, welche Bereiche sichtbar sind.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleMobileAccess}
                                            disabled={!onMobileAccessAction || isMobileActionLoading}
                                            className={cn(
                                                "flex w-full items-center justify-between gap-4 rounded-2xl border p-2 pl-4 text-left transition sm:w-64",
                                                appAccess?.isAccessEnabled
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-50 text-slate-500",
                                                (!onMobileAccessAction || isMobileActionLoading) && "cursor-not-allowed opacity-60"
                                            )}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">
                                                {appAccess?.isAccessEnabled ? "Zugriff aktiv" : "Nicht aktiviert"}
                                            </span>
                                            <span className={cn(
                                                "relative h-9 w-16 rounded-full transition",
                                                appAccess?.isAccessEnabled ? "bg-emerald-500" : "bg-slate-300"
                                            )}>
                                                <span className={cn(
                                                    "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition",
                                                    appAccess?.isAccessEnabled ? "left-8" : "left-1"
                                                )} />
                                            </span>
                                        </button>
                                    </div>

                                    <div className="grid gap-4 pt-5 md:grid-cols-3">
                                        <InfoCard icon={Smartphone} title="Zugang">
                                            <InfoRow label="Mitarbeiter-App-ID" value={appAccess?.staffId || "Noch nicht vergeben"} mono />
                                            <InfoRow label="PIN" value={appAccess?.accessPIN ? "Gesetzt" : "Nicht gesetzt"} />
                                            <InfoRow label="Letzter Login" value={appAccess?.lastLogin ? formatDate(appAccess.lastLogin) : "Noch kein Login"} />
                                            <div className="border-t border-slate-100 pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => runMobileAccessAction({ action: "generateActivationCode" })}
                                                    disabled={!onMobileAccessAction || isMobileActionLoading}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <KeyRound className="h-4 w-4" />
                                                    Aktivierungscode erzeugen
                                                </button>
                                                {activationCode && (
                                                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Einmaliger Code</p>
                                                        <div className="mt-2 flex items-center justify-between gap-2">
                                                            <span className="font-mono text-2xl font-black text-slate-950">{activationCode}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => navigator.clipboard?.writeText(activationCode)}
                                                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 transition hover:bg-amber-100"
                                                                title="Code kopieren"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                        <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                                                            Nur jetzt sichtbar. Gültig bis {activationCodeExpiresAt ? formatDate(activationCodeExpiresAt) : "-"}.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => runMobileAccessAction({ action: "revokeActivationCode" })}
                                                            disabled={isMobileActionLoading}
                                                            className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                                                        >
                                                            Code widerrufen
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </InfoCard>

                                        <div className="md:col-span-2">
                                            <InfoCard icon={Shield} title="Berechtigungen">
                                                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                                                    {["Start", "Profil"].map((module) => (
                                                        <div key={module} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-sm font-black text-slate-700">{module}</span>
                                                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                                                    Immer an
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {appPermissions.map((permission) => (
                                                        <button
                                                            type="button"
                                                            key={permission.label}
                                                            onClick={() => togglePermission(permission.key)}
                                                            disabled={!onMobileAccessAction || isMobileActionLoading}
                                                            className={cn(
                                                                "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0",
                                                                permission.enabled
                                                                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                                                    : "border-slate-100 bg-slate-50 text-slate-400 hover:border-indigo-100 hover:text-slate-600",
                                                                (!onMobileAccessAction || isMobileActionLoading) && "opacity-60"
                                                            )}
                                                        >
                                                            <span>
                                                                <span className="block text-sm font-black">{permission.label}</span>
                                                                <span className="mt-1 block text-xs font-semibold opacity-70">{permission.description}</span>
                                                            </span>
                                                            <span className={cn(
                                                                "relative h-7 w-12 rounded-full transition",
                                                                permission.enabled ? "bg-emerald-500" : "bg-slate-300"
                                                            )}>
                                                                <span className={cn(
                                                                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                                                                    permission.enabled ? "left-6" : "left-1"
                                                                )} />
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </InfoCard>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                                <Briefcase className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">Projekte fuer Mitarbeiter</p>
                                                <h4 className="mt-1 text-xl font-black text-slate-950">Mobile-Projektzuordnung</h4>
                                                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                                    Mobile sieht nur die hier aktiv zugeordneten Projekte. Der Schalter oben erlaubt das Modul, diese Liste steuert den Zugriff.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cn(
                                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                                appAccess?.permissions?.projectDiary ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                            )}>
                                                {appAccess?.permissions?.projectDiary ? "Modul aktiv" : "Modul aus"}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                {mobileProjectAssignments.length}/{maxMobileProjectAssignments}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projekt zuordnen</p>
                                            <div className="mt-3 space-y-2">
                                                <select
                                                    value={selectedMobileProjectId}
                                                    onChange={(event) => setSelectedMobileProjectId(event.target.value)}
                                                    disabled={isMobileProjectsLoading || mobileProjectAssignments.length >= maxMobileProjectAssignments}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <option value="">
                                                        {assignableMobileProjects.length > 0 ? "Aktives Projekt auswaehlen" : "Keine aktiven Projekte verfuegbar"}
                                                    </option>
                                                    {assignableMobileProjects.map((project) => (
                                                        <option key={project.id} value={project.id}>
                                                            {project.projectNumber ? `${project.projectNumber} - ` : ""}{project.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    value={mobileProjectTask}
                                                    onChange={(event) => setMobileProjectTask(event.target.value)}
                                                    placeholder="Aufgabe optional, z.B. Montage"
                                                    disabled={isMobileProjectsLoading || mobileProjectAssignments.length >= maxMobileProjectAssignments}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={assignMobileProject}
                                                    disabled={!selectedMobileProjectId || isMobileProjectsLoading || mobileProjectAssignments.length >= maxMobileProjectAssignments}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isMobileProjectsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                    Projekt zuweisen
                                                </button>
                                            </div>
                                            {mobileProjectAssignments.length >= maxMobileProjectAssignments && (
                                                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                                                    Maximum erreicht: Ein mobiler Mitarbeiter kann bis zu {maxMobileProjectAssignments} aktive Projekte sehen.
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aktiv zugeordnet</p>
                                                {isMobileProjectsLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                            </div>

                                            {mobileProjectsError && (
                                                <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                                    {mobileProjectsError}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {mobileProjectAssignments.length === 0 ? (
                                                    <p className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-400">Noch keine Projekte zugeordnet.</p>
                                                ) : (
                                                    mobileProjectAssignments.map((assignment) => {
                                                        const project = assignment.project;
                                                        const address = project?.address
                                                            ? [project.address.street, project.address.zip, project.address.city].filter(Boolean).join(", ")
                                                            : "";
                                                        return (
                                                            <div key={assignment.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-black text-slate-900">
                                                                        {project?.projectNumber ? `${project.projectNumber} - ` : ""}{project?.name || assignment.projectId}
                                                                    </p>
                                                                    {assignment.task && (
                                                                        <p className="mt-1 text-xs font-bold text-emerald-700">{assignment.task}</p>
                                                                    )}
                                                                    {address && (
                                                                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400">
                                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                                            <span className="truncate">{address}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeMobileProjectAssignment(assignment.id)}
                                                                    disabled={isMobileProjectsLoading}
                                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                                                    title="Zuordnung entfernen"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-500">Dokumente fuer Mitarbeiter</p>
                                                <h4 className="mt-1 text-xl font-black text-slate-950">Mobile-Dokumentfreigabe</h4>
                                                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                                                    Hier werden Ordner und freigegebene PDF-/Bilddateien fuer die Mobile-App verwaltet. Mobile sieht diese Dokumente nur lesend und nur bei aktivem Dokumente-Modul.
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                            appAccess?.permissions?.documents ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {appAccess?.permissions?.documents ? "Modul aktiv" : "Modul aus"}
                                        </span>
                                    </div>

                                    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
                                        <div className="space-y-3">
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ordner erstellen</p>
                                                <div className="mt-3 flex gap-2">
                                                    <input
                                                        value={newMobileFolderName}
                                                        onChange={(event) => setNewMobileFolderName(event.target.value)}
                                                        placeholder="z.B. Lohnzettel"
                                                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={createMobileFolder}
                                                        disabled={!newMobileFolderName.trim() || isMobileDocumentsLoading}
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                                        title="Ordner erstellen"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dokument hochladen</p>
                                                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-white px-4 py-5 text-center transition hover:bg-sky-50">
                                                    <Upload className="mb-2 h-6 w-6 text-sky-500" />
                                                    <span className="max-w-full truncate text-sm font-black text-slate-900">
                                                        {mobileUploadFile ? mobileUploadFile.name : "PDF oder Bild auswaehlen"}
                                                    </span>
                                                    <span className="mt-1 text-xs font-semibold text-slate-400">
                                                        {mobileUploadFile ? formatFileSize(mobileUploadFile.size) : "max. 10 MB"}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="application/pdf,image/jpeg,image/png,image/webp"
                                                        className="hidden"
                                                        onChange={(event) => {
                                                            const file = event.target.files?.[0] || null;
                                                            setMobileUploadFile(file);
                                                            setMobileUploadName(file?.name || "");
                                                        }}
                                                    />
                                                </label>
                                                {mobileUploadFile && (
                                                    <div className="mt-3 space-y-2">
                                                        <input
                                                            value={mobileUploadName}
                                                            onChange={(event) => setMobileUploadName(event.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                                        />
                                                        <select
                                                            value={mobileUploadFolderId}
                                                            onChange={(event) => setMobileUploadFolderId(event.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                                        >
                                                            <option value="">Oberste Ebene</option>
                                                            {mobileFolders.map((folder) => (
                                                                <option key={folder.id} value={folder.id}>{folder.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={uploadMobileDocument}
                                                            disabled={isMobileDocumentsLoading}
                                                            className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
                                                        >
                                                            Fuer Mobile freigeben
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Freigegebene Struktur</p>
                                                {isMobileDocumentsLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                            </div>

                                            {mobileDocumentsError && (
                                                <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                                                    {mobileDocumentsError}
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {[{ id: "", name: "Oberste Ebene" }, ...mobileFolders].map((folder) => {
                                                    const folderDocs = mobileDocuments.filter((doc) => (doc.folderId || "") === folder.id);
                                                    return (
                                                        <div key={folder.id || "root"} className="rounded-2xl border border-slate-200 bg-white p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <Folder className="h-4 w-4 shrink-0 text-sky-500" />
                                                                    <span className="truncate text-sm font-black text-slate-900">{folder.name}</span>
                                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{folderDocs.length}</span>
                                                                </div>
                                                                {folder.id && folderDocs.length === 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteMobileFolder(folder.id)}
                                                                        disabled={isMobileDocumentsLoading}
                                                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                                                        title="Ordner loeschen"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 space-y-2">
                                                                {folderDocs.length === 0 ? (
                                                                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">Keine Dokumente</p>
                                                                ) : (
                                                                    folderDocs.map((doc) => (
                                                                        <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-sm font-black text-slate-800">{doc.name}</p>
                                                                                <p className="text-xs font-semibold text-slate-400">{formatFileSize(doc.fileSize)} · {doc.isShared ? "freigegeben" : "gesperrt"}</p>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => deleteMobileDocument(doc.id)}
                                                                                disabled={isMobileDocumentsLoading}
                                                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                                                                title="Dokument loeschen"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {sharedLegacyDocs > 0 && (
                                                <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                                                    {sharedLegacyDocs} alte `isShared`-Dokumente existieren noch im bisherigen Mitarbeiterarchiv.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {isUploadOpen && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center bg-white/30 p-4">
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
