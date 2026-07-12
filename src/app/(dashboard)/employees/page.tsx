"use client";

import React, { useMemo, useRef, useState } from "react";
import {
    Briefcase,
    ChevronDown,
    ChevronRight,
    Download,
    Edit2,
    FileDown,
    FileText,
    Folder,
    Library,
    Loader2,
    Mail,
    Phone,
    Plus,
    RefreshCcw,
    Search,
    Trash2,
    User,
    UserCheck,
    UserSquare2,
    UserX,
    Users2,
} from "lucide-react";
import { useSWRConfig } from "swr";
import { Employee, EmployeeDocument, EmploymentStatus } from "@/types/employee";
import { EmployeeModal } from "@/components/EmployeeModal";
import { EmployeeDetailModal } from "@/components/EmployeeDetailModal";
import { EmployeeDataSheetPDF } from "@/components/EmployeeDataSheetPDF";
import { DienstzettelPDF } from "@/components/DienstzettelPDF";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNotification } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("de-AT");
};

const employeeName = (employee: Employee) =>
    `${employee.personalData.firstName} ${employee.personalData.lastName}`.trim() || "Unbenannter Mitarbeiter";

const initialsFor = (employee: Employee) =>
    employeeName(employee)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";

export default function EmployeesPage() {
    const { employees, addEmployee, updateEmployee, deleteEmployee, getNextEmployeeNumber, isLoading } = useEmployees();
    const { data: companySettings } = useCompanySettings();
    usePermissionGuard("employees_read");

    const { profile } = useAuth();
    const canCreate = profile?.role === "admin" || profile?.role === "developer" || !!profile?.permissions?.employees_create;
    const canWrite = profile?.role === "admin" || profile?.role === "developer" || !!profile?.permissions?.employees_write;
    const { showToast, showConfirm } = useNotification();
    const { mutate: mutateAll } = useSWRConfig();

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<EmploymentStatus | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "archive">("list");
    const [listTab, setListTab] = useState<"active" | "inactive">("active");
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
    const [exitDate, setExitDate] = useState(new Date().toISOString().split("T")[0]);
    const [exitReason, setExitReason] = useState("Vorübergehend / Winterpause");
    const [pdfEmployee, setPdfEmployee] = useState<Employee | null>(null);
    const [contractEmployee, setContractEmployee] = useState<Employee | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const contractContainerRef = useRef<HTMLDivElement>(null);

    const stats = useMemo(() => {
        const active = employees.filter((employee) => employee.employment.isActive !== false);
        const inactive = employees.filter((employee) => employee.employment.isActive === false);
        const noTimeTracking = active.filter((employee) => employee.additionalInfo?.noTimeTrackingRequired).length;
        const documents = employees.reduce((sum, employee) => sum + (employee.documents?.length || 0), 0);

        return {
            active: active.length,
            inactive: inactive.length,
            fullTime: active.filter((employee) => employee.employment.status === "Vollzeit").length,
            partTime: active.filter((employee) => employee.employment.status === "Teilzeit").length,
            noTimeTracking,
            documents,
        };
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return employees
            .filter((employee) => {
                const isActive = employee.employment.isActive !== false;
                const matchesTab = listTab === "active" ? isActive : !isActive;
                const matchesStatus = filterStatus === "all" || employee.employment.status === filterStatus;
                const matchesSearch =
                    !query ||
                    employeeName(employee).toLowerCase().includes(query) ||
                    employee.employeeNumber?.toLowerCase().includes(query) ||
                    employee.employment.position?.toLowerCase().includes(query) ||
                    employee.personalData.email?.toLowerCase().includes(query) ||
                    employee.personalData.phone?.toLowerCase().includes(query);

                return matchesTab && matchesStatus && matchesSearch;
            })
            .sort((a, b) => {
                const numA = parseInt(a.employeeNumber.replace(/\D/g, "")) || 0;
                const numB = parseInt(b.employeeNumber.replace(/\D/g, "")) || 0;
                return numA - numB;
            });
    }, [employees, filterStatus, listTab, searchQuery]);

    const archiveEmployees = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return employees
            .filter((employee) => {
                const docs = employee.documents || [];
                if (docs.length === 0) return false;
                if (!query) return true;

                return (
                    employeeName(employee).toLowerCase().includes(query) ||
                    employee.employeeNumber?.toLowerCase().includes(query) ||
                    docs.some((doc) => doc.name.toLowerCase().includes(query))
                );
            })
            .sort((a, b) => {
                const numA = parseInt(a.employeeNumber.replace(/\D/g, "")) || 0;
                const numB = parseInt(b.employeeNumber.replace(/\D/g, "")) || 0;
                return numA - numB;
            });
    }, [employees, searchQuery]);

    const activeSelectedEmployee = useMemo(() => {
        if (!selectedEmployee) return null;
        return employees.find((employee) => employee.id === selectedEmployee.id) || null;
    }, [employees, selectedEmployee]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutateAll(() => true);
        setIsRefreshing(false);
    };

    const handleSaveEmployee = async (employee: Employee, skipContract?: boolean) => {
        if (editingEmployee) {
            updateEmployee(employee.id, employee);
            setIsModalOpen(false);
            setEditingEmployee(undefined);
            return;
        }

        if (skipContract) {
            addEmployee(employee);
            showToast("Mitarbeiter erfolgreich angelegt.", "success");
            setIsModalOpen(false);
            return;
        }

        showToast("Mitarbeiter wird angelegt und Dienstzettel erstellt...", "info");
        setContractEmployee(employee);

        setTimeout(async () => {
            if (!contractContainerRef.current) return;
            try {
                const html2pdf = (await import("html2pdf.js")).default;
                const worker = html2pdf().from(contractContainerRef.current).set({
                    margin: 0,
                    filename: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                    image: { type: "jpeg" as any, quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as any },
                });
                const pdfBlob = await worker.output("blob");
                const reader = new FileReader();
                reader.onloadend = () => {
                    const newDoc: EmployeeDocument = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                        type: "application/pdf",
                        uploadDate: new Date().toISOString(),
                        fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                        content: reader.result as string,
                        category: "system",
                        subType: "dienstzettel",
                    };
                    addEmployee({ ...employee, documents: [...employee.documents, newDoc] });
                    showToast("Mitarbeiter mit Dienstzettel erfolgreich angelegt.", "success");
                    setContractEmployee(null);
                    setIsModalOpen(false);
                };
                reader.readAsDataURL(pdfBlob);
            } catch (error) {
                console.error("Dienstzettel generation failed:", error);
                addEmployee(employee);
                setContractEmployee(null);
                setIsModalOpen(false);
            }
        }, 800);
    };

    const handleManualGenerateContract = async (employee: Employee) => {
        showToast("Dienstzettel wird generiert...", "info");
        setContractEmployee(employee);

        setTimeout(async () => {
            if (!contractContainerRef.current) return;
            try {
                const html2pdf = (await import("html2pdf.js")).default;
                const worker = html2pdf().from(contractContainerRef.current).set({
                    margin: 0,
                    filename: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                    image: { type: "jpeg" as any, quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as any },
                });
                const pdfBlob = await worker.output("blob");
                const reader = new FileReader();
                reader.onloadend = () => {
                    const newDoc: EmployeeDocument = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                        type: "application/pdf",
                        uploadDate: new Date().toISOString(),
                        fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                        content: reader.result as string,
                        category: "system",
                        subType: "dienstzettel",
                    };
                    const updatedEmployee = { ...employee, documents: [...employee.documents, newDoc] };
                    updateEmployee(employee.id, updatedEmployee);
                    showToast("Dienstzettel wurde generiert und im Archiv gespeichert.", "success");
                    setContractEmployee(null);
                    worker.save();
                };
                reader.readAsDataURL(pdfBlob);
            } catch (error) {
                console.error("Manual contract generation failed:", error);
                showToast("Fehler bei der PDF-Erstellung.", "error");
                setContractEmployee(null);
            }
        }, 800);
    };

    const handleDeleteEmployee = (id: string) => {
        showConfirm({
            title: "Mitarbeiter endgültig löschen?",
            message: "Möchten Sie diesen Mitarbeiter und all seine Daten wirklich unwiderruflich aus der Datenbank löschen?",
            variant: "danger",
            confirmLabel: "Jetzt endgültig löschen",
            onConfirm: () => {
                deleteEmployee(id);
                showToast("Mitarbeiter erfolgreich gelöscht.", "success");
            },
        });
    };

    const handleDeactivateConfirm = async () => {
        if (!deactivatingEmployee) return;
        updateEmployee(deactivatingEmployee.id, {
            ...deactivatingEmployee,
            employment: {
                ...deactivatingEmployee.employment,
                isActive: false,
                endDate: exitDate,
                exitReason,
            },
        });
        showToast("Mitarbeiter erfolgreich abgemeldet und archiviert.", "success");
        setDeactivatingEmployee(null);
    };

    const handleReactivateEmployee = async (employee: Employee) => {
        showConfirm({
            title: "Mitarbeiter reaktivieren?",
            message: `Möchten Sie ${employeeName(employee)} reaktivieren und einen frischen Dienstzettel generieren?`,
            confirmLabel: "Reaktivieren",
            cancelLabel: "Abbrechen",
            variant: "primary",
            onConfirm: async () => {
                const updatedEmployee: Employee = {
                    ...employee,
                    employment: {
                        ...employee.employment,
                        isActive: true,
                        endDate: undefined,
                        exitReason: undefined,
                        startDate: new Date().toISOString().split("T")[0],
                    },
                };
                updateEmployee(employee.id, updatedEmployee);
                showToast("Mitarbeiter reaktiviert. Dienstzettel wird erstellt...", "info");
                handleManualGenerateContract(updatedEmployee);
            },
        });
    };

    const handleDeleteDocument = (employeeId: string, docId: string) => {
        showConfirm({
            title: "Dokument löschen?",
            message: "Möchten Sie dieses Dokument wirklich aus dem Archiv entfernen?",
            variant: "danger",
            onConfirm: () => {
                const employee = employees.find((entry) => entry.id === employeeId);
                if (!employee) return;
                updateEmployee(employeeId, {
                    ...employee,
                    documents: employee.documents.filter((doc) => doc.id !== docId),
                });
                showToast("Dokument gelöscht.", "success");
            },
        });
    };

    const handleAddDocument = (employeeId: string, doc: EmployeeDocument) => {
        const employee = employees.find((entry) => entry.id === employeeId);
        if (!employee) return;

        updateEmployee(employeeId, {
            ...employee,
            documents: [...(employee.documents || []), doc],
        });
        showToast("Dokument wurde hochgeladen.", "success");
    };

    const handlePreview = (doc: EmployeeDocument) => {
        setPreviewDoc(doc);
        setIsPreviewOpen(true);
    };

    const handleDownloadPDF = async (employee: Employee) => {
        setPdfEmployee(employee);
        setDownloadingId(employee.id);

        setTimeout(async () => {
            if (!pdfContainerRef.current) return;
            try {
                const html2pdf = (await import("html2pdf.js")).default;
                const worker = html2pdf().from(pdfContainerRef.current).set({
                    margin: 0,
                    filename: `Personaldatenblatt_${employee.personalData.lastName}_${employee.personalData.firstName}.pdf`,
                    image: { type: "jpeg" as any, quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as any },
                });

                const pdfBlob = await worker.output("blob");
                const reader = new FileReader();
                reader.onloadend = () => {
                    const newDoc: EmployeeDocument = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: `Personaldatenblatt_${employee.personalData.lastName}.pdf`,
                        type: "application/pdf",
                        uploadDate: new Date().toISOString(),
                        fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                        content: reader.result as string,
                        category: "system",
                    };
                    updateEmployee(employee.id, { ...employee, documents: [...employee.documents, newDoc] });
                };
                reader.readAsDataURL(pdfBlob);
                await worker.save();
            } catch (error) {
                console.error("PDF generation failed:", error);
            } finally {
                setPdfEmployee(null);
                setDownloadingId(null);
            }
        }, 500);
    };

    if (isLoading) {
        return (
            <div className="dashboard-page flex items-center justify-center">
                <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-sm font-black text-slate-500 shadow-sm">
                    Mitarbeiter werden geladen...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <section className="relative overflow-hidden rounded-[34px] border border-white bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-500 p-7 text-white shadow-xl shadow-indigo-500/20">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2 ring-1 ring-white/20">
                            <UserSquare2 className="h-5 w-5 text-cyan-100" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100">Personal</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                            {viewMode === "list" ? "Mitarbeiter" : "Dokumenten-Archiv"}
                        </h1>
                        <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-white/75">
                            {viewMode === "list"
                                ? "Personalstammdaten, Zeiteinteilung, Dokumente und Dienstzettel an einem Ort."
                                : "Alle Personalunterlagen gesammelt und nach Mitarbeitern gruppiert."}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex rounded-2xl bg-white/12 p-1 ring-1 ring-white/20">
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition",
                                    viewMode === "list" ? "bg-white text-indigo-700 shadow-lg" : "text-white/75 hover:bg-white/10"
                                )}
                            >
                                <Users2 className="h-4 w-4" />
                                Mitarbeiter
                            </button>
                            <button
                                onClick={() => setViewMode("archive")}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition",
                                    viewMode === "archive" ? "bg-white text-indigo-700 shadow-lg" : "text-white/75 hover:bg-white/10"
                                )}
                            >
                                <Library className="h-4 w-4" />
                                Archiv
                            </button>
                        </div>

                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-60"
                            title="Daten aus Cloud aktualisieren"
                        >
                            <RefreshCcw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                        </button>

                        {viewMode === "list" && canCreate && (
                            <button
                                onClick={() => {
                                    setEditingEmployee(undefined);
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5"
                            >
                                <Plus className="h-5 w-5" />
                                Neuer Mitarbeiter
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {viewMode === "list" ? (
                <>
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {[
                            { label: "Aktiv", value: stats.active, icon: UserCheck, tone: "emerald" },
                            { label: "Archiviert", value: stats.inactive, icon: UserX, tone: "rose" },
                            { label: "Vollzeit", value: stats.fullTime, icon: Briefcase, tone: "indigo" },
                            { label: "Teilzeit", value: stats.partTime, icon: Users2, tone: "blue" },
                            { label: "Ohne Zeiterfassung", value: stats.noTimeTracking, icon: FileText, tone: "amber" },
                        ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-2xl",
                                            stat.tone === "emerald" && "bg-emerald-50 text-emerald-600",
                                            stat.tone === "rose" && "bg-rose-50 text-rose-600",
                                            stat.tone === "indigo" && "bg-indigo-50 text-indigo-600",
                                            stat.tone === "blue" && "bg-blue-50 text-blue-600",
                                            stat.tone === "amber" && "bg-amber-50 text-amber-600"
                                        )}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className="text-3xl font-black text-slate-950">{stat.value}</span>
                                    </div>
                                    <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                </div>
                            );
                        })}
                    </section>

                    <section className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Mitarbeiter suchen nach Name, Nummer, Position, E-Mail oder Telefon..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                />
                            </div>

                            <div className="flex rounded-2xl bg-slate-100 p-1">
                                {[
                                    { id: "active", label: `Aktiv (${stats.active})` },
                                    { id: "inactive", label: `Archiviert (${stats.inactive})` },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setListTab(tab.id as "active" | "inactive")}
                                        className={cn(
                                            "rounded-xl px-4 py-3 text-xs font-black transition",
                                            listTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex rounded-2xl bg-slate-100 p-1">
                                {[
                                    { id: "all", label: "Alle" },
                                    { id: "Vollzeit", label: "Vollzeit" },
                                    { id: "Teilzeit", label: "Teilzeit" },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setFilterStatus(filter.id as EmploymentStatus | "all")}
                                        className={cn(
                                            "rounded-xl px-4 py-3 text-xs font-black transition",
                                            filterStatus === filter.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {filteredEmployees.length > 0 ? (
                        <section className="grid gap-4">
                            {filteredEmployees.map((employee) => {
                                const isActive = employee.employment.isActive !== false;
                                const name = employeeName(employee);

                                return (
                                    <article
                                        key={employee.id}
                                        onClick={() => setSelectedEmployee(employee)}
                                        className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70"
                                    >
                                        <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr_1.2fr_auto] xl:items-center">
                                            <div className="flex min-w-0 items-center gap-4">
                                                {employee.avatar ? (
                                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                                        <img src={employee.avatar} alt={name} className="h-full w-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-black text-indigo-600 ring-1 ring-indigo-100">
                                                        {initialsFor(employee)}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                            #{employee.employeeNumber || "---"}
                                                        </span>
                                                        <span className={cn(
                                                            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                                                            isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            {isActive ? "Aktiv" : "Archiviert"}
                                                        </span>
                                                    </div>
                                                    <h3 className="truncate text-xl font-black text-slate-950 group-hover:text-indigo-700">{name}</h3>
                                                    <p className="mt-1 text-sm font-bold text-slate-500">{employee.employment.workerType}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position</p>
                                                <p className="mt-1 font-black text-slate-900">{employee.employment.position || "Keine Position"}</p>
                                                <p className="mt-1 text-sm font-bold text-slate-500">{employee.employment.status} seit {formatDate(employee.employment.startDate)}</p>
                                            </div>

                                            <div className="grid gap-2 text-sm font-bold text-slate-500 sm:grid-cols-2 xl:grid-cols-1">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Mail className="h-4 w-4 shrink-0 text-slate-300" />
                                                    <span className="truncate">{employee.personalData.email || "Keine E-Mail"}</span>
                                                </span>
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <Phone className="h-4 w-4 shrink-0 text-slate-300" />
                                                    <span className="truncate">{employee.personalData.phone || "Keine Telefonnummer"}</span>
                                                </span>
                                            </div>

                                            <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                                                {canWrite && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingEmployee(employee);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                                                        title="Bearbeiten"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDownloadPDF(employee)}
                                                    disabled={downloadingId === employee.id}
                                                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                                                    title="Personaldatenblatt PDF"
                                                >
                                                    {downloadingId === employee.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                                                </button>
                                                {canWrite && (isActive ? (
                                                    <button
                                                        onClick={() => setDeactivatingEmployee(employee)}
                                                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                                        title="Abmelden"
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleReactivateEmployee(employee)}
                                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                                                            title="Reaktivieren"
                                                        >
                                                            <UserCheck className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEmployee(employee.id)}
                                                            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                                            title="Endgültig löschen"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                ))}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    ) : (
                        <section className="rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                                <Search className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-950">Keine Mitarbeiter gefunden</h3>
                            <p className="mt-2 font-semibold text-slate-500">Passe Suche oder Filter an.</p>
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterStatus("all");
                                }}
                                className="mt-5 rounded-2xl bg-indigo-50 px-5 py-3 text-sm font-black text-indigo-600 transition hover:bg-indigo-100"
                            >
                                Filter zurücksetzen
                            </button>
                        </section>
                    )}
                </>
            ) : (
                <section className="space-y-4">
                    <div className="relative rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
                        <Search className="absolute left-8 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Dokumente oder Mitarbeiter suchen..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        />
                    </div>

                    {archiveEmployees.length > 0 ? (
                        archiveEmployees.map((employee) => {
                            const docs = employee.documents.filter((doc) => {
                                const query = searchQuery.trim().toLowerCase();
                                if (!query) return true;
                                return doc.name.toLowerCase().includes(query) || employeeName(employee).toLowerCase().includes(query);
                            });
                            const isExpanded = expandedFolders[employee.id];

                            if (docs.length === 0) return null;

                            return (
                                <div key={employee.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                    <button
                                        onClick={() => setExpandedFolders((prev) => ({ ...prev, [employee.id]: !prev[employee.id] }))}
                                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
                                    >
                                        <div className="flex min-w-0 items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                                <Folder className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-lg font-black text-slate-950">#{employee.employeeNumber || "---"} - {employeeName(employee)}</h3>
                                                <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-400">
                                                    {employee.employment.position || "Mitarbeiter"} · {docs.length} Dokumente
                                                </p>
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                                            <div className="grid gap-2">
                                                {docs.map((doc) => (
                                                    <button
                                                        key={doc.id}
                                                        onClick={() => handlePreview(doc)}
                                                        className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:shadow-sm"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className={cn(
                                                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                                                                doc.category === "system" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                                                            )}>
                                                                <FileText className="h-5 w-5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-black text-slate-900 group-hover:text-indigo-700">{doc.name}</p>
                                                                <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(doc.uploadDate)} · {doc.fileSize || "-"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
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
                                                                className="flex h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                                Download
                                                            </button>
                                                            {canWrite && (
                                                                <button
                                                                    onClick={() => handleDeleteDocument(employee.id, doc.id)}
                                                                    className="flex h-10 items-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Löschen
                                                                </button>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-[32px] border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                                <Library className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-950">Archiv leer</h3>
                            <p className="mt-2 font-semibold text-slate-500">Es wurden noch keine Dokumente für Mitarbeiter hinterlegt.</p>
                        </div>
                    )}
                </section>
            )}

            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEmployee(undefined);
                }}
                onSave={handleSaveEmployee}
                onGenerateContract={handleManualGenerateContract}
                initialEmployee={editingEmployee}
                getNextNumber={getNextEmployeeNumber}
            />

            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={previewDoc}
            />

            {activeSelectedEmployee && (
                <EmployeeDetailModal
                    isOpen={!!activeSelectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    employee={activeSelectedEmployee}
                    onStartEdit={canWrite ? (employee) => {
                        setSelectedEmployee(null);
                        setEditingEmployee(employee);
                        setIsModalOpen(true);
                    } : undefined}
                    onDownloadPDF={(employee) => handleDownloadPDF(employee)}
                    onDeactivate={canWrite ? (employee) => {
                        setSelectedEmployee(null);
                        setDeactivatingEmployee(employee);
                    } : undefined}
                    onReactivate={canWrite ? (employee) => {
                        setSelectedEmployee(null);
                        handleReactivateEmployee(employee);
                    } : undefined}
                    onDelete={canWrite ? (id) => {
                        setSelectedEmployee(null);
                        handleDeleteEmployee(id);
                    } : undefined}
                    onDeleteDocument={canWrite ? (employeeId, docId) => handleDeleteDocument(employeeId, docId) : undefined}
                    onAddDocument={canWrite ? (employeeId, doc) => handleAddDocument(employeeId, doc) : undefined}
                    onPreviewDocument={(doc) => handlePreview(doc)}
                    isDownloadingPDF={downloadingId === activeSelectedEmployee.id}
                />
            )}

            {deactivatingEmployee && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-[32px] border border-white bg-white p-7 shadow-2xl">
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <UserX className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-950">Mitarbeiter abmelden</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                {employeeName(deactivatingEmployee)} wird ins Archiv verschoben und bleibt dort weiter auffindbar.
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Offizielles Austrittsdatum</span>
                                <input
                                    type="date"
                                    value={exitDate}
                                    onChange={(event) => setExitDate(event.target.value)}
                                    className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Austrittsgrund</span>
                                <select
                                    value={exitReason}
                                    onChange={(event) => setExitReason(event.target.value)}
                                    className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                                >
                                    <option value="Vorübergehend / Winterpause">Vorübergehend / Winterpause</option>
                                    <option value="Selbst gekündigt">Selbst gekündigt</option>
                                    <option value="Wurde gekündigt">Wurde gekündigt</option>
                                    <option value="Einvernehmliche Lösung">Einvernehmliche Lösung</option>
                                    <option value="Rente / Pension">Rente / Pension</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setDeactivatingEmployee(null)}
                                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                onClick={handleDeactivateConfirm}
                                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700"
                            >
                                Abmelden
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", overflow: "hidden", height: 0 }}>
                {pdfEmployee && (
                    <EmployeeDataSheetPDF
                        ref={pdfContainerRef}
                        employee={pdfEmployee}
                        companySettings={companySettings}
                    />
                )}
            </div>

            <div style={{ position: "absolute", left: "-9999px", top: "-9999px", overflow: "hidden", height: 0 }}>
                {contractEmployee && (
                    <DienstzettelPDF
                        ref={contractContainerRef}
                        employee={contractEmployee}
                        companySettings={companySettings}
                    />
                )}
            </div>
        </div>
    );
}
