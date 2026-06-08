"use client";

import React, { useState, useMemo, useRef } from "react";
import {
    Search,
    Plus,
    Filter,
    User,
    UserSquare2,
    Edit2,
    Trash2,
    ExternalLink,
    Mail,
    Phone,
    Briefcase,
    CreditCard,
    FileDown,
    Loader2,
    Library,
    Users2,
    CalendarDays,
    FileText,
    Download,
    Eye,
    ChevronRight,
    ChevronDown,
    Folder,
    Bell,
    Check,
    RefreshCcw,
    UserX,
    UserCheck,
    X as CloseIcon
} from "lucide-react";
import { Employee, EmploymentStatus, EmployeeDocument } from "@/types/employee";
import { EmployeeModal } from "@/components/EmployeeModal";
import { EmployeeDataSheetPDF } from "@/components/EmployeeDataSheetPDF";
import { DienstzettelPDF } from "@/components/DienstzettelPDF";
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNotification } from "@/context/NotificationContext";
import { useSWRConfig } from "swr";

export default function EmployeesPage() {
    const { employees, addEmployee, updateEmployee, deleteEmployee, getNextEmployeeNumber, isLoading } = useEmployees();
    const { data: companySettings } = useCompanySettings();
    const { showToast, showConfirm } = useNotification();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<EmploymentStatus | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'list' | 'archive'>('list');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    // Archive & reactivation states
    const [listTab, setListTab] = useState<'active' | 'inactive'>('active');
    const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const [exitReason, setExitReason] = useState("Vorübergehend / Winterpause");

    // PDF States
    const [pdfEmployee, setPdfEmployee] = useState<Employee | null>(null);
    const [contractEmployee, setContractEmployee] = useState<Employee | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const contractContainerRef = useRef<HTMLDivElement>(null);

    // Preview States
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Refresh States
    const { mutate: mutateAll } = useSWRConfig();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const isActive = emp.employment.isActive !== false;
            const matchesTab = listTab === 'active' ? isActive : !isActive;

            const matchesSearch =
                `${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employment.position.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = filterStatus === "all" || emp.employment.status === filterStatus;

            return matchesTab && matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const numA = parseInt(a.employeeNumber.replace(/\D/g, "")) || 0;
            const numB = parseInt(b.employeeNumber.replace(/\D/g, "")) || 0;
            return numA - numB;
        });
    }, [employees, listTab, searchQuery, filterStatus]);

    const handleSaveEmployee = async (employee: Employee, skipContract?: boolean) => {
        if (editingEmployee) {
            updateEmployee(employee.id, employee);
            setIsModalOpen(false);
            setEditingEmployee(undefined);
        } else {
            if (skipContract) {
                addEmployee(employee);
                showToast("Mitarbeiter erfolgreich angelegt.", "success");
                setIsModalOpen(false);
                return;
            }

            // Automatic Dienstzettel generation for new employees
            showToast("Mitarbeiter wird angelegt und Dienstzettel erstellt...", "info");
            setContractEmployee(employee);

            // Wait for render
            setTimeout(async () => {
                if (contractContainerRef.current) {
                    try {
                        const html2pdf = (await import('html2pdf.js')).default;
                        const element = contractContainerRef.current;
                        const opt = {
                            margin: 0,
                            filename: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                            image: { type: 'jpeg' as any, quality: 0.98 },
                            html2canvas: { scale: 2, useCORS: true },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as any }
                        };

                        const worker = html2pdf().from(element).set(opt);
                        const pdfBlob = await worker.output('blob');

                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            const newDoc: EmployeeDocument = {
                                id: Math.random().toString(36).substr(2, 9),
                                name: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                                type: 'application/pdf',
                                uploadDate: new Date().toISOString(),
                                fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                                content: base64data,
                                category: 'system',
                                subType: 'dienstzettel'
                            };

                            const employeeWithContract = {
                                ...employee,
                                documents: [...employee.documents, newDoc]
                            };

                            addEmployee(employeeWithContract);
                            showToast("Mitarbeiter mit Dienstzettel erfolgreich angelegt.", "success");
                            setContractEmployee(null);
                            setIsModalOpen(false);
                        };
                        reader.readAsDataURL(pdfBlob);
                    } catch (error) {
                        console.error("Dienstzettel generation failed:", error);
                        addEmployee(employee); // Save anyway even if PDF fails
                        setIsModalOpen(false);
                    }
                }
            }, 800);
        }
    };

    const handleManualGenerateContract = async (employee: Employee) => {
        showToast("Dienstzettel wird generiert...", "info");
        setContractEmployee(employee);

        setTimeout(async () => {
            if (contractContainerRef.current) {
                try {
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = contractContainerRef.current;
                    const opt = {
                        margin: 0,
                        filename: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                        image: { type: 'jpeg' as any, quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as any }
                    };

                    const worker = html2pdf().from(element).set(opt);
                    const pdfBlob = await worker.output('blob');

                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        const newDoc: EmployeeDocument = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: `Dienstzettel_${employee.personalData.lastName}.pdf`,
                            type: 'application/pdf',
                            uploadDate: new Date().toISOString(),
                            fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                            content: base64data,
                            category: 'system',
                            subType: 'dienstzettel'
                        };

                        const updatedEmployee = {
                            ...employee,
                            documents: [...employee.documents, newDoc]
                        };

                        updateEmployee(employee.id, updatedEmployee);
                        showToast("Dienstzettel wurde generiert und im Archiv gespeichert.", "success");
                        setContractEmployee(null);

                        // If modal is open, update the form data so the new document appears
                        if (editingEmployee && editingEmployee.id === employee.id) {
                            setEditingEmployee(updatedEmployee);
                        }

                        // Save the file for user download
                        worker.save();
                    };
                    reader.readAsDataURL(pdfBlob);
                } catch (error) {
                    console.error("Manual contract generation failed:", error);
                    showToast("Fehler bei der PDF-Erstellung.", "error");
                    setContractEmployee(null);
                }
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
            }
        });
    };

    const handleDeactivateConfirm = async () => {
        if (!deactivatingEmployee) return;
        const updatedEmployee: Employee = {
            ...deactivatingEmployee,
            employment: {
                ...deactivatingEmployee.employment,
                isActive: false,
                endDate: exitDate,
                exitReason: exitReason
            }
        };
        updateEmployee(deactivatingEmployee.id, updatedEmployee);
        showToast("Mitarbeiter erfolgreich abgemeldet und archiviert.", "success");
        setDeactivatingEmployee(null);
    };

    const handleReactivateEmployee = async (employee: Employee) => {
        showConfirm({
            title: "Mitarbeiter reaktivieren?",
            message: `Möchten Sie ${employee.personalData.firstName} ${employee.personalData.lastName} reaktivieren und einen frischen Dienstzettel generieren?`,
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
                        startDate: new Date().toISOString().split('T')[0]
                    }
                };
                
                updateEmployee(employee.id, updatedEmployee);
                showToast("Mitarbeiter reaktiviert. Dienstzettel wird erstellt...", "info");
                
                // Let's generate a fresh Dienstzettel!
                handleManualGenerateContract(updatedEmployee);
            }
        });
    };

    const handleEditEmployee = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const toggleFolder = (id: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleDeleteDocument = (employeeId: string, docId: string) => {
        showConfirm({
            title: "Dokument löschen?",
            message: "Möchten Sie dieses Dokument wirklich aus dem Archiv entfernen?",
            variant: "danger",
            onConfirm: () => {
                const employee = employees.find(e => e.id === employeeId);
                if (employee) {
                    const updatedEmployee = {
                        ...employee,
                        documents: employee.documents.filter(d => d.id !== docId)
                    };
                    updateEmployee(employeeId, updatedEmployee);
                    showToast("Dokument gelöscht.", "success");
                }
            }
        });
    };

    const handlePreview = (doc: EmployeeDocument) => {
        setPreviewDoc(doc);
        setIsPreviewOpen(true);
    };

    const handleDownloadPDF = async (employee: Employee) => {
        setPdfEmployee(employee);
        setDownloadingId(employee.id);

        // Short timeout to ensure the component is rendered before PDF generation
        setTimeout(async () => {
            if (pdfContainerRef.current) {
                try {
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = pdfContainerRef.current;
                    const opt = {
                        margin: 0,
                        filename: `Personaldatenblatt_${employee.personalData.lastName}_${employee.personalData.firstName}.pdf`,
                        image: { type: 'jpeg' as any, quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as any }
                    };

                    const worker = html2pdf().from(element).set(opt);

                    // Add to archive (save as base64)
                    const pdfBlob = await worker.output('blob');
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result as string;
                        const newDoc: EmployeeDocument = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: `Personaldatenblatt_${employee.personalData.lastName}.pdf`,
                            type: 'application/pdf',
                            uploadDate: new Date().toISOString(),
                            fileSize: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
                            content: base64data,
                            category: 'system'
                        };

                        const updatedEmployee = {
                            ...employee,
                            documents: [...employee.documents, newDoc]
                        };
                        updateEmployee(employee.id, updatedEmployee);
                    };
                    reader.readAsDataURL(pdfBlob);

                    // Save the file for user download
                    await worker.save();
                } catch (error) {
                    console.error("PDF generation failed:", error);
                } finally {
                    setPdfEmployee(null);
                    setDownloadingId(null);
                }
            }
        }, 500);
    };

    if (isLoading) {
        return (
            <div className="p-10 flex items-center justify-center">
                <div className="text-slate-400 font-bold">Laden...</div>
            </div>
        );
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await mutateAll(() => true);
        setIsRefreshing(false);
    };

    return (
        <div className="flex-1 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <UserSquare2 className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-[0.2em]">HR & Personal</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight font-outfit">
                        {viewMode === 'list' && (<>Mitarbeiter <span className="text-slate-300 font-light">Verwalten</span></>)}
                        {viewMode === 'archive' && (<>Dokumenten <span className="text-slate-300 font-light">Archiv</span></>)}
                    </h1>
                    <p className="text-xl text-slate-500 font-medium">
                        {viewMode === 'list' && "Verwalten Sie Ihr Team, Unterlagen und Personalstammdaten."}
                        {viewMode === 'archive' && "Chronologische Übersicht aller Mitarbeiter-Dokumente gruppiert nach Ordnernamen."}
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                viewMode === 'list'
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Users2 className="h-4 w-4" />
                            Mitarbeiter
                        </button>
                        <button
                            onClick={() => setViewMode('archive')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                viewMode === 'archive'
                                    ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Library className="h-4 w-4" />
                            Archiv
                        </button>

                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="bg-white text-slate-400 p-4 rounded-2xl border border-slate-100 shadow-sm hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
                            title="Daten aus Cloud aktualisieren"
                        >
                            <RefreshCcw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                        </button>

                        {viewMode === 'list' && (
                            <button
                                onClick={() => {
                                    setEditingEmployee(undefined);
                                    setIsModalOpen(true);
                                }}
                                className="bg-primary-gradient text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <Plus className="h-5 w-5" /> Neuer Mitarbeiter
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-6">
                        {[
                            { label: "Gesamt (Aktiv)", count: employees.filter(e => e.employment.isActive !== false).length, color: "text-slate-600", bg: "bg-slate-100", icon: UserSquare2 },
                            { label: "Vollzeit", count: employees.filter(e => e.employment.isActive !== false && e.employment.status === 'Vollzeit').length, color: "text-emerald-600", bg: "bg-emerald-50", icon: Briefcase },
                            { label: "Teilzeit", count: employees.filter(e => e.employment.isActive !== false && e.employment.status === 'Teilzeit').length, color: "text-blue-600", bg: "bg-blue-50", icon: Users2 },
                        ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                                            <Icon className={cn("h-6 w-6", stat.color)} />
                                        </div>
                                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <span className={cn("font-black text-3xl px-4 py-2 rounded-2xl", stat.color, stat.bg)}>{stat.count}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active/Inactive List Tabs */}
                    <div className="flex border-b border-slate-100 gap-6">
                        <button
                            onClick={() => setListTab('active')}
                            className={cn(
                                "pb-4 font-black text-sm transition-all border-b-2 relative",
                                listTab === 'active'
                                    ? "border-indigo-600 text-indigo-600 font-black"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Aktiv ({employees.filter(e => e.employment.isActive !== false).length})
                        </button>
                        <button
                            onClick={() => setListTab('inactive')}
                            className={cn(
                                "pb-4 font-black text-sm transition-all border-b-2 relative",
                                listTab === 'inactive'
                                    ? "border-indigo-600 text-indigo-600 font-black"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Inaktiv / Archivierte Mitarbeiter ({employees.filter(e => e.employment.isActive === false).length})
                        </button>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Mitarbeiter suchen nach Name oder Position..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        <div className="bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                            {[
                                { id: "all", label: "Alle", icon: Filter },
                                { id: "Vollzeit", label: "Vollzeit", icon: Briefcase },
                                { id: "Teilzeit", label: "Teilzeit", icon: Users2 }
                            ].map((btn) => {
                                const Icon = btn.icon;
                                const active = filterStatus === btn.id;
                                return (
                                    <button
                                        key={btn.id}
                                        onClick={() => setFilterStatus(btn.id as any)}
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                            active
                                                ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-white/40"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {btn.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {filteredEmployees.length > 0 ? (
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Mitarbeiter</th>
                                            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Personalnummer</th>
                                            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Position & Anstellung</th>
                                            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Kontakt</th>
                                            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/70">
                                        {filteredEmployees.map((emp) => {
                                            const name = `${emp.personalData.firstName} ${emp.personalData.lastName}`;
                                            return (
                                                <tr 
                                                    key={emp.id} 
                                                    onClick={() => handleEditEmployee(emp)}
                                                    className="group hover:bg-slate-50/50 transition-all duration-150 cursor-pointer"
                                                >
                                                    <td className="px-8 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "h-11 w-11 rounded-xl flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-slate-100",
                                                                emp.avatar ? "bg-white animate-in fade-in" : "bg-indigo-50 text-indigo-600"
                                                            )}>
                                                                {emp.avatar ? (
                                                                    <img src={emp.avatar} alt={name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <User className="h-5 w-5" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">{name}</h4>
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{emp.employment.workerType}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">
                                                        #{emp.employeeNumber || "---"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-slate-800">{emp.employment.position}</div>
                                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">{emp.employment.status}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col text-xs font-medium text-slate-500 gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="h-3.5 w-3.5 text-slate-300" />
                                                                <span>{emp.personalData.email || "keine E-Mail"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="h-3.5 w-3.5 text-slate-300" />
                                                                <span>{emp.personalData.phone || "keine Tel."}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            {emp.employment.isActive === false ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-rose-50 text-rose-500 border border-rose-100">
                                                                    Inaktiv
                                                                </span>
                                                            ) : emp.employment.endDate && new Date(emp.employment.endDate) <= new Date() ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                                                                    Ausgetreten
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                                    Aktiv
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditEmployee(emp);
                                                                }}
                                                                className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                                                                title="Bearbeiten"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadPDF(emp);
                                                                }}
                                                                disabled={downloadingId === emp.id}
                                                                className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                                title="Personaldatenblatt PDF"
                                                            >
                                                                {downloadingId === emp.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileDown className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                            {emp.employment.isActive !== false ? (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeactivatingEmployee(emp);
                                                                    }}
                                                                    className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                                                    title="Abmelden (Deaktivieren)"
                                                                >
                                                                    <UserX className="h-4 w-4" />
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleReactivateEmployee(emp);
                                                                        }}
                                                                        className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                                                                        title="Reaktivieren (Wieder anmelden)"
                                                                    >
                                                                        <UserCheck className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteEmployee(emp.id);
                                                                        }}
                                                                        className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                                                                        title="Endgültig löschen"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                                <Search className="h-10 w-10 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xl font-bold text-slate-900">Keine Mitarbeiter gefunden</h4>
                                <p className="text-slate-500 font-medium">Versuchen Sie es mit einem anderen Suchbegriff oder Filter.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterStatus("all");
                                }}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Alle Filter zurücksetzen
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6">
                    {/* Archive Filtering */}
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Dokumente oder Mitarbeiter suchen..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Archive - Folder Layout */}
                    <div className="space-y-4">
                        {employees.filter(emp =>
                            emp.documents.length > 0 &&
                            (searchQuery === "" ||
                                `${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                emp.documents.some(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())))
                        ).sort((a, b) => {
                            const numA = parseInt(a.employeeNumber.replace(/\D/g, "")) || 0;
                            const numB = parseInt(b.employeeNumber.replace(/\D/g, "")) || 0;
                            return numA - numB;
                        }).map(emp => {
                            const isExpanded = expandedFolders[emp.id];
                            const docs = emp.documents.filter(d =>
                                searchQuery === "" ||
                                d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                `${emp.personalData.firstName} ${emp.personalData.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            if (docs.length === 0) return null;

                            return (
                                <div key={emp.id} className="glass-card overflow-hidden">
                                    <button
                                        onClick={() => toggleFolder(emp.id)}
                                        className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <Folder className="h-5 w-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-slate-900">#{emp.employeeNumber || "---"} - {emp.personalData.firstName} {emp.personalData.lastName}</h3>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{emp.employment.position} • {docs.length} Dokumente</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">Mitarbeiterordner</span>
                                            {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                                            <div className="grid grid-cols-1 gap-2">
                                                {docs.map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "h-9 w-9 rounded-lg flex items-center justify-center",
                                                                doc.category === 'system' ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                                            )}>
                                                                <FileText className="h-4 w-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-slate-700">{doc.name}</p>
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                                                        doc.category === 'system' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                                                    )}>
                                                                        {doc.category === 'system' ? 'System' : 'Upload'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 font-medium">{new Date(doc.uploadDate).toLocaleDateString()} • {doc.fileSize}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handlePreview(doc)}
                                                                className="h-8 px-3 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px] flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                                                            >
                                                                <Eye className="h-3 w-3" /> Vorschau
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (doc.content) {
                                                                        const link = document.createElement('a');
                                                                        link.href = doc.content;
                                                                        link.download = doc.name;
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    }
                                                                }}
                                                                className="h-8 px-3 bg-slate-50 text-slate-600 rounded-lg font-bold text-[10px] flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="h-3 w-3" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDocument(emp.id, doc.id)}
                                                                className="h-8 px-3 bg-slate-50 text-rose-600 rounded-lg font-bold text-[10px] flex items-center gap-1.5 hover:bg-rose-100 transition-colors"
                                                                title="Löschen"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {employees.every(e => e.documents.length === 0) && (
                            <div className="glass-card py-24 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-2">
                                    <Library className="h-10 w-10 text-slate-200" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-bold text-slate-900">Archiv leer</h4>
                                    <p className="text-slate-500 font-medium">Es wurden noch keine Dokumente für Ihre Mitarbeiter hinterlegt.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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

            {deactivatingEmployee && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2 text-center">
                            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
                                <UserX className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Mitarbeiter abmelden</h3>
                            <p className="text-sm text-slate-500 font-medium">
                                Melden Sie {deactivatingEmployee.personalData.firstName} {deactivatingEmployee.personalData.lastName} vom aktiven Dienst ab. Er wird ins Archiv verschoben.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Offizielles Austrittsdatum</label>
                                <input
                                    type="date"
                                    value={exitDate}
                                    onChange={(e) => setExitDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-950"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Austrittsgrund</label>
                                <select
                                    value={exitReason}
                                    onChange={(e) => setExitReason(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-950"
                                >
                                    <option value="Vorübergehend / Winterpause">Vorübergehend / Winterpause</option>
                                    <option value="Selbst gekündigt">Selbst gekündigt</option>
                                    <option value="Wurde gekündigt">Wurde gekündigt</option>
                                    <option value="Einvernehmliche Lösung">Einvernehmliche Lösung</option>
                                    <option value="Rente / Pension">Rente / Pension</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeactivatingEmployee(null)}
                                className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="button"
                                onClick={handleDeactivateConfirm}
                                className="flex-1 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md shadow-rose-500/10 transition-all"
                            >
                                Abmelden
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden PDF Container */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden', height: 0 }}>
                {pdfEmployee && (
                    <EmployeeDataSheetPDF
                        ref={pdfContainerRef}
                        employee={pdfEmployee}
                        companySettings={companySettings}
                    />
                )}
            </div>

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden', height: 0 }}>
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
