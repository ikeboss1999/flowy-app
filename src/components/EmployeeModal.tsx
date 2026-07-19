"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    User,
    Briefcase,
    CreditCard,
    FileText,
    Plus,
    Trash2,
    Download,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Stethoscope,
    Shield,
    Upload,
    Clock,
    Eye,
    Folder,
    Smartphone,
    Activity,
    LogOut,
    Share2,
    Camera,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { Employee, EmploymentStatus, EmployeeDocument } from "@/types/employee";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { useNotification } from "@/context/NotificationContext";
import { useUsers } from "@/hooks/useUsers";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAuth } from "@/context/AuthContext";
import { mutate } from "swr";

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee, skipContract?: boolean) => void;
    onGenerateContract?: (employee: Employee) => void;
    initialEmployee?: Employee;
    getNextNumber?: () => string;
}

const TABS = [
    { id: "personal", label: "Persönlich", icon: User },
    { id: "employment", label: "Anstellung", icon: Briefcase },
    { id: "schedule", label: "Zeiteinteilung", icon: Clock },
    { id: "bank", label: "Bankdaten", icon: CreditCard },
    { id: "documents", label: "Archiv", icon: FileText },
    { id: "app-access", label: "Mobile App", icon: Smartphone, disabled: true },
];

const EU_EWR_COUNTRIES = [
    "Belgien", "Bulgarien", "Dänemark", "Deutschland", "Estland", "Finnland", "Frankreich",
    "Griechenland", "Irland", "Italien", "Kroatien", "Lettland", "Litauen", "Luxemburg",
    "Malta", "Niederlande", "Österreich", "Polen", "Portugal", "Rumänien", "Schweden",
    "Slowakei", "Slowenien", "Spanien", "Tschechien", "Ungarn", "Zypern",
    "Island", "Liechtenstein", "Norwegen", "Schweiz"
];

const EUROPEAN_COUNTRIES = [
    "Albanien", "Andorra", "Armenien", "Aserbaidschan", "Belarus", "Belgien", "Bosnien und Herzegowina",
    "Bulgarien", "Dänemark", "Deutschland", "Estland", "Finnland", "Frankreich", "Georgien",
    "Griechenland", "Irland", "Island", "Italien", "Kasachstan", "Kosovo", "Kroatien", "Lettland",
    "Liechtenstein", "Litauen", "Luxemburg", "Malta", "Moldau", "Monaco", "Montenegro",
    "Niederlande", "Nordmazedonien", "Norwegen", "Österreich", "Polen", "Portugal", "Rumänien",
    "Russland", "San Marino", "Schweden", "Schweiz", "Serbien", "Slowakei", "Slowenien",
    "Spanien", "Tschechien", "Türkei", "Ukraine", "Ungarn", "Vatikanstadt", "Vereinigtes Königreich"
];

export function EmployeeModal({ isOpen, onClose, onSave, onGenerateContract, initialEmployee, getNextNumber }: EmployeeModalProps) {
    const { user } = useAuth();
    const [employeeId, setEmployeeId] = useState("");
    const [isInitialized, setIsInitialized] = useState(false);
    const initialValuesRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const { users } = useUsers();

    const getUserDisplayName = (userId?: string) => {
        if (!userId) return "System";
        const found = users?.find((u: any) => u.user_id === userId);
        return found ? `${found.name} (${found.email})` : `Benutzer: ${userId.substring(0, 8)}`;
    };
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const { showConfirm, showPrompt, showToast } = useNotification();
    const [formData, setFormData] = useState<Employee>(() => initialEmployee || {
        id: Math.random().toString(36).substr(2, 9),
        employeeNumber: "",
        personalData: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            birthday: "",
            birthPlace: "",
            birthCountry: "",
            nationality: "Deutsch",
            maritalStatus: "Ledig",
            street: "",
            city: "",
            zip: "",
            socialSecurityNumber: "",
            taxId: "",
            healthInsurance: "",
        },
        bankDetails: {
            iban: "",
            bic: "",
            bankName: "",
        },
        employment: {
            position: "",
            status: "Vollzeit",
            startDate: new Date().toISOString().split('T')[0],
            endDate: "",
            exitReason: "",
            salary: "",
            workerType: "Arbeiter",
            classification: "",
            verwendung: "",
            annualLeave: 25,
        },
        additionalInfo: {
            noTimeTrackingRequired: false,
        },
        weeklySchedule: {
            monday: { enabled: true, hours: 8 },
            tuesday: { enabled: true, hours: 8 },
            wednesday: { enabled: true, hours: 8 },
            thursday: { enabled: true, hours: 8 },
            friday: { enabled: true, hours: 8 },
            saturday: { enabled: false, hours: 0 },
            sunday: { enabled: false, hours: 0 },
        },
        documents: [],
        createdAt: new Date().toISOString(),
    });

    useEffect(() => {
        if (!isOpen) return;
        const nextId = initialEmployee?.id || Math.random().toString(36).substr(2, 9);
        setEmployeeId(nextId);
        setIsInitialized(false);
        initialValuesRef.current = null;
        if (initialEmployee) {
            setFormData({
                ...initialEmployee,
                employment: {
                    ...initialEmployee.employment,
                    workerType: initialEmployee.employment.workerType || "Arbeiter",
                    classification: initialEmployee.employment.classification || "",
                    verwendung: initialEmployee.employment.verwendung || "",
                    annualLeave: initialEmployee.employment.annualLeave ?? 25,
                },
                additionalInfo: {
                    ...initialEmployee.additionalInfo,
                    noTimeTrackingRequired: initialEmployee.additionalInfo?.noTimeTrackingRequired ?? false,
                },
                documents: initialEmployee.documents || [],
                appAccess: initialEmployee.appAccess ? {
                    ...initialEmployee.appAccess,
                    staffId: initialEmployee.appAccess.staffId || Math.floor(10000000 + Math.random() * 90000000).toString(),
                    permissions: initialEmployee.appAccess.permissions || {
                        timeTracking: true,
                        documents: false,
                        personalData: true,
                        projectDiary: false
                    }
                } : {
                    staffId: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    accessPIN: "",
                    isAccessEnabled: false,
                    permissions: {
                        timeTracking: true,
                        documents: false,
                        personalData: true,
                        projectDiary: false
                    }
                }
            });
        } else {
            const nextNum = getNextNumber ? getNextNumber() : "";
            setFormData({
                id: nextId,
                employeeNumber: nextNum,
                personalData: {
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    birthday: "",
                    birthPlace: "",
                    birthCountry: "",
                    nationality: "Deutsch",
                    maritalStatus: "Ledig",
                    street: "",
                    city: "",
                    zip: "",
                    socialSecurityNumber: "",
                    taxId: "",
                    healthInsurance: "",
                },
                bankDetails: {
                    iban: "",
                    bic: "",
                    bankName: "",
                },
                employment: {
                    position: "",
                    status: "Vollzeit",
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: "",
                    exitReason: "",
                    salary: "",
                    workerType: "Arbeiter",
                    classification: "",
                    verwendung: "",
                    annualLeave: 25,
                },
                additionalInfo: {
                    noTimeTrackingRequired: false,
                },
                weeklySchedule: {
                    monday: { enabled: true, hours: 8 },
                    tuesday: { enabled: true, hours: 8 },
                    wednesday: { enabled: true, hours: 8 },
                    thursday: { enabled: true, hours: 8 },
                    friday: { enabled: true, hours: 8 },
                    saturday: { enabled: false, hours: 0 },
                    sunday: { enabled: false, hours: 0 },
                },
                documents: [],
                createdAt: new Date().toISOString(),
                appAccess: {
                    staffId: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    accessPIN: "",
                    isAccessEnabled: false,
                    permissions: {
                        timeTracking: true,
                        documents: false,
                        personalData: true,
                        projectDiary: false
                    }
                }
            });
        }
    }, [initialEmployee, isOpen]);

    useEffect(() => {
        if (isOpen && !isInitialized && formData.id) {
            initialValuesRef.current = {
                ...formData,
                additionalInfo: {
                    ...formData.additionalInfo,
                    isDraft: initialEmployee ? (formData.additionalInfo as any)?.isDraft : true
                }
            };
            setIsInitialized(true);
        }
    }, [isOpen, isInitialized, formData, initialEmployee]);

    const isDirty = useMemo(() => {
        if (!initialValuesRef.current) return false;
        return JSON.stringify(formData) !== JSON.stringify({
            ...initialValuesRef.current,
            additionalInfo: {
                ...initialValuesRef.current.additionalInfo,
                isDraft: formData.additionalInfo?.isDraft
            }
        });
    }, [formData]);

    const autoSavePayload = useMemo(() => {
        const isDraftVal = initialEmployee ? (formData.additionalInfo as any)?.isDraft : true;
        return {
            ...formData,
            additionalInfo: {
                ...formData.additionalInfo,
                isDraft: isDraftVal
            }
        };
    }, [formData, initialEmployee]);

    const { isSaving, lastSaved } = useAutoSave({
        id: employeeId,
        endpoint: "/api/employees",
        data: autoSavePayload,
        isDirty,
        onSaveSuccess: () => {
            initialValuesRef.current = {
                ...formData,
                additionalInfo: {
                    ...formData.additionalInfo,
                    isDraft: initialEmployee ? (formData.additionalInfo as any)?.isDraft : true
                }
            };
            if (user) {
                mutate(`/api/employees?userId=${user.id}`);
            }
        }
    });

    const generateStaffId = () => {
        const id = Math.floor(10000000 + Math.random() * 90000000).toString();
        setFormData(prev => ({
            ...prev,
            appAccess: {
                ...(prev.appAccess || {
                    accessPIN: "",
                    isAccessEnabled: false,
                    permissions: { timeTracking: true, documents: false, personalData: true, projectDiary: false }
                }),
                staffId: id
            }
        }));
    };

    const generatePIN = () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        setFormData(prev => ({
            ...prev,
            appAccess: {
                ...(prev.appAccess || {
                    staffId: Math.floor(10000000 + Math.random() * 90000000).toString(),
                    isAccessEnabled: false,
                    permissions: { timeTracking: true, documents: false, personalData: true, projectDiary: false }
                }),
                accessPIN: pin
            }
        }));
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setFormData(prev => ({ ...prev, avatar: base64 }));
            setShowAvatarMenu(false);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarDelete = () => {
        setFormData(prev => ({ ...prev, avatar: undefined }));
        setShowAvatarMenu(false);
    };

    const handleSharedUpload = async (files: FileList | null, folder?: string) => {
        if (!files || files.length === 0) return;

        const uploadPromises = Array.from(files).map(file => {
            console.log(`[EmployeeModal] Processing file: ${file.name}, size: ${file.size}, folder: ${folder}`);
            return new Promise<EmployeeDocument>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    const stats = file.size > 1024 * 1024
                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(file.size / 1024).toFixed(0)} KB`;

                    resolve({
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        type: file.type || "application/octet-stream",
                        uploadDate: new Date().toISOString(),
                        fileSize: stats,
                        content: base64,
                        category: 'hr_shared',
                        subType: 'general',
                        folder: folder,
                        isShared: true
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        try {
            const newDocs = await Promise.all(uploadPromises);
            console.log(`[EmployeeModal] Upload successful, adding ${newDocs.length} documents.`, newDocs);
            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, ...newDocs]
            }));
            showToast(`${newDocs.length} Dokument(e) erfolgreich hochgeladen und freigegeben.`, 'success');
        } catch (error) {
            console.error("Upload failed:", error);
            showToast("Fehler beim Hochladen der Dokumente.", 'error');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Mandatory Field Validation
        const missingFields: string[] = [];
        if (!formData.personalData.firstName) missingFields.push("Vorname");
        if (!formData.personalData.lastName) missingFields.push("Nachname");
        if (!formData.personalData.birthday) missingFields.push("Geburtsdatum");
        if (!formData.personalData.birthPlace) missingFields.push("Geburtsort");
        if (!formData.personalData.birthCountry) missingFields.push("Geburtsland");
        if (!formData.personalData.nationality) missingFields.push("Staatsbürgerschaft");
        if (!formData.personalData.street || !formData.personalData.zip || !formData.personalData.city) missingFields.push("Vollständige Anschrift");
        if (!formData.personalData.socialSecurityNumber) missingFields.push("Sozialversicherungsnummer");
        if (!formData.employment.startDate) missingFields.push("Eintrittsdatum");
        if (!formData.bankDetails.iban) missingFields.push("IBAN");

        if (missingFields.length > 0) {
            showToast(`Bitte füllen Sie folgende Pflichtfelder aus: ${missingFields.join(", ")}`, 'error');
            // Auto-switch to first tab with error if possible
            if (!formData.personalData.firstName || !formData.personalData.lastName || !formData.personalData.birthday) {
                setActiveTab("personal");
            } else if (!formData.employment.startDate) {
                setActiveTab("employment");
            } else if (!formData.bankDetails.iban) {
                setActiveTab("bank");
            }
            return;
        }

        // 2. Validation for Non-EU Passport
        const isEUEWR = EU_EWR_COUNTRIES.includes(formData.personalData.nationality);
        if (!isEUEWR) {
            const hasPassport = formData.documents.some(d => d.subType === 'passport');
            if (!hasPassport) {
                showConfirm({
                    title: "Reisepass erforderlich",
                    message: "Für Nicht-EU/EWR Staatsbürger muss zwingend ein Reisepass hochgeladen werden.",
                    confirmLabel: "Zu den Dokumenten",
                    cancelLabel: "Abbrechen",
                    onConfirm: () => setActiveTab("documents"),
                    variant: 'primary'
                });
                return;
            }
        }

        // 3. Dienstzettel Validation (only for new employees or if being generated)
        const isNew = !initialEmployee;
        const missingContractFields = !formData.employment.salary ||
            !formData.employment.classification ||
            !formData.employment.verwendung ||
            !formData.employment.startDate ||
            !formData.employment.position;

        if (isNew && missingContractFields) {
            showConfirm({
                title: "Dienstzettel unvollständig",
                message: "Es fehlen Pflichtangaben für den automatischen Dienstzettel (Gehalt, Verwendung, Einstufung etc.). Möchten Sie die Daten ergänzen oder den Mitarbeiter ohne Dienstzettel anlegen?",
                confirmLabel: "Daten ergänzen",
                cancelLabel: "Ohne Dienstzettel anlegen",
                onConfirm: () => setActiveTab("employment"),
                onCancel: () => {
                    const finalEmployee = {
                        ...formData,
                        additionalInfo: {
                            ...formData.additionalInfo,
                            isDraft: false
                        }
                    };
                    onSave(finalEmployee, true);
                    onClose();
                },
                variant: 'primary'
            });
            return;
        }

        const finalEmployee = {
            ...formData,
            additionalInfo: {
                ...formData.additionalInfo,
                isDraft: false
            }
        };
        onSave(finalEmployee);
        onClose();
    };


    const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, subType: string, customName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const extension = file.name.split('.').pop();
            
            const existingCount = formData.documents.filter(d => d.subType === subType).length;
            const suffix = existingCount > 0 ? `_${existingCount + 1}` : '';
            const fileName = `${customName}${suffix}.${extension}`;

            const newDoc: EmployeeDocument = {
                id: Math.random().toString(36).substr(2, 9),
                name: fileName,
                type: file.type || "application/octet-stream",
                uploadDate: new Date().toISOString(),
                fileSize: file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(file.size / 1024).toFixed(0)} KB`,
                content: base64,
                category: 'upload',
                subType: subType
            };

            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, newDoc]
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveSlotDocument = (docId: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.id !== docId)
        }));
    };

    const handleDownloadStoredDocument = (doc: EmployeeDocument) => {
        if (!doc.content) return;

        const link = document.createElement('a');
        link.href = doc.content;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = (doc: EmployeeDocument) => {
        setPreviewDoc(doc);
        setIsPreviewOpen(true);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-white/30 p-3 sm:p-4">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl 2xl:max-w-7xl">
                {/* Header */}
                <div className="relative shrink-0 overflow-visible border-b border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-5 py-5 text-white sm:px-7">
                    <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                    <div className="relative flex justify-between items-center gap-4">
                    <div className="flex min-w-0 items-center gap-4 relative">
                        <div 
                            className="relative cursor-pointer group"
                            onClick={() => {
                                if (formData.avatar) {
                                    setShowAvatarMenu(!showAvatarMenu);
                                } else {
                                    avatarInputRef.current?.click();
                                }
                            }}
                        >
                            {formData.avatar ? (
                                <div className="h-14 w-14 rounded-2xl overflow-hidden shadow-md ring-4 ring-white/20 border-2 border-white/40 group-hover:opacity-90 transition-opacity sm:h-16 sm:w-16">
                                    <img src={formData.avatar} alt="Profile" className="h-full w-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-sm border border-white/20 group-hover:bg-white/20 transition-colors sm:h-16 sm:w-16">
                                    <User className="h-7 w-7 sm:h-8 sm:w-8" />
                                </div>
                            )}

                            {showAvatarMenu && formData.avatar && (
                                <div className="absolute top-16 left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[200] animate-in fade-in slide-in-from-top-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            avatarInputRef.current?.click();
                                            setShowAvatarMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                                    >
                                        Profilbild ändern
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAvatarDelete();
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-sm font-medium text-rose-600 transition-colors"
                                    >
                                        Profilbild löschen
                                    </button>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                        />
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100">Personalakte</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-black text-white leading-none sm:text-[28px]">
                                {initialEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
                            </h2>
                            {isSaving ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-white/80 animate-pulse">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Auto-Save...
                                </span>
                            ) : lastSaved ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-semibold text-white/80">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-300" /> Gespeichert {lastSaved}
                                </span>
                            ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                <p className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/75">#{formData.employeeNumber || "---"}</p>
                                <p className="text-xs font-semibold text-white/50">Personalakte</p>
                                {formData.avatar && (
                                    <button
                                        type="button"
                                        onClick={handleAvatarDelete}
                                        className="text-white hover:text-rose-100 text-xs font-bold flex items-center gap-1 transition-colors px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg"
                                        title="Profilbild entfernen"
                                    >
                                        <Trash2 className="h-3 w-3" /> Bild entfernen
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-11 w-11 rounded-2xl bg-white/12 text-white flex items-center justify-center hover:bg-white/20 transition-colors border border-white/15"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-72 bg-slate-50 border-r border-slate-100 flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-hide">
                        <div className="flex md:flex-col w-full p-3 md:p-5 gap-2">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black text-sm min-h-14 whitespace-nowrap md:whitespace-normal border",
                                            active
                                                ? "bg-white text-indigo-600 shadow-sm border-indigo-100"
                                                : tab.disabled
                                                    ? "opacity-60 text-slate-400 hover:text-slate-500 hover:bg-white/70 border-transparent"
                                                    : "text-slate-500 hover:text-slate-800 hover:bg-white/80 border-transparent"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-indigo-600" : "text-slate-300")} />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="hidden md:block">{tab.label}</span>
                                            <span className="md:hidden text-xs">{tab.label}</span>
                                            {tab.disabled && (
                                                <span className="text-[8px] text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded-md mt-0.5">
                                                    In Arbeit
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right side: Form + Footer */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/50 p-4 xl:p-8">
                            {activeTab === "personal" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
                                    {/* Group: Basisinformationen */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <User className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Basisinformationen</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            {/* Profile Picture Uploader & Deletion UI */}
                                            <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row items-center gap-6 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm mb-2">
                                                <div 
                                                    className="relative cursor-pointer group shrink-0" 
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    title="Profilbild hochladen / ändern"
                                                >
                                                    {formData.avatar ? (
                                                        <div className="h-24 w-24 rounded-2xl overflow-hidden shadow-md ring-4 ring-indigo-50 border-2 border-white group-hover:opacity-90 transition-opacity">
                                                            <img src={formData.avatar} alt="Profile" className="h-full w-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-24 w-24 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 group-hover:bg-indigo-200 transition-colors">
                                                            <User className="h-10 w-10" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white">
                                                        <Camera className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 text-center md:text-left space-y-2">
                                                    <h4 className="font-bold text-slate-800 text-sm">Profilbild des Mitarbeiters</h4>
                                                    <p className="text-xs text-slate-400 font-medium">Laden Sie ein Foto für das Mitarbeiterprofil hoch oder entfernen Sie das bestehende Bild.</p>
                                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => avatarInputRef.current?.click()}
                                                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors rounded-xl font-bold text-xs"
                                                        >
                                                            Bild hochladen
                                                        </button>
                                                        {formData.avatar && (
                                                            <button
                                                                type="button"
                                                                onClick={handleAvatarDelete}
                                                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors rounded-xl font-bold text-xs flex items-center gap-1"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" /> Bild entfernen
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Personalnummer</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-indigo-600 shadow-sm"
                                                    value={formData.employeeNumber}
                                                    onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })}
                                                    placeholder="Wird automatisch vergeben"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Vorname <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm"
                                                    value={formData.personalData.firstName}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, firstName: e.target.value } })}
                                                    placeholder="z.B. Max"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Nachname <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm"
                                                    value={formData.personalData.lastName}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, lastName: e.target.value } })}
                                                    placeholder="z.B. Mustermann"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">E-Mail Adresse</label>
                                                <input
                                                    type="email"
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.email}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, email: e.target.value } })}
                                                    placeholder="max@beispiel.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Telefon</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.phone}
                                                    onChange={e => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        setFormData({ ...formData, personalData: { ...formData.personalData, phone: value } });
                                                    }}
                                                    placeholder="06641234567"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Group: Herkunft & Status */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                                <Calendar className="h-4 w-4 text-purple-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Herkunft & Status</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Geburtsdatum <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.birthday}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthday: e.target.value } })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Familienstand</label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none"
                                                    value={formData.personalData.maritalStatus}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, maritalStatus: e.target.value } })}
                                                >
                                                    <option value="Ledig">Ledig</option>
                                                    <option value="Verheiratet">Verheiratet</option>
                                                    <option value="Geschieden">Geschieden</option>
                                                    <option value="Verwitwet">Verwitwet</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Geburtsort <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.birthPlace}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthPlace: e.target.value } })}
                                                    placeholder="z.B. Berlin"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Geburtsland <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none"
                                                    value={formData.personalData.birthCountry}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthCountry: e.target.value } })}
                                                >
                                                    <option value="">Land wählen...</option>
                                                    {EUROPEAN_COUNTRIES.map(country => (
                                                        <option key={country} value={country}>{country}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2 col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Staatsangehörigkeit <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none"
                                                    value={formData.personalData.nationality}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, nationality: e.target.value } })}
                                                >
                                                    <option value="">Staatsbürgerschaft wählen...</option>
                                                    {EUROPEAN_COUNTRIES.map(country => (
                                                        <option key={country} value={country}>{country}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Group: Adresse & Versicherung */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                <MapPin className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Adresse & Versicherung</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            <div className="space-y-2 col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Anschrift <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <input
                                                        className="col-span-2 px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                        value={formData.personalData.street}
                                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, street: e.target.value } })}
                                                        placeholder="Straße, Hausnummer"
                                                    />
                                                    <input
                                                        className="col-span-1 px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                        value={formData.personalData.zip}
                                                        onChange={e => {
                                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                                            setFormData({ ...formData, personalData: { ...formData.personalData, zip: value } });
                                                        }}
                                                        placeholder="PLZ"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                    />
                                                    <input
                                                        className="col-span-3 px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                        value={formData.personalData.city}
                                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, city: e.target.value } })}
                                                        placeholder="Stadt"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Sozialversicherungsnummer <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.socialSecurityNumber}
                                                    onChange={e => {
                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                        setFormData({ ...formData, personalData: { ...formData.personalData, socialSecurityNumber: value } });
                                                    }}
                                                    placeholder="1234010185"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Krankenkasse</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.healthInsurance}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, healthInsurance: e.target.value } })}
                                                    placeholder="z.B. ÖGK, SVS"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Systemprotokoll */}
                                    {formData.created_by && (
                                        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 mt-10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                    <Activity className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <h3 className="text-lg font-black text-slate-800 tracking-tight">Systemprotokoll</h3>
                                            </div>
                                            <div className="p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100/80 space-y-4 text-xs font-bold text-slate-500">
                                                <div className="flex justify-between items-center py-2 border-b border-slate-100/50">
                                                    <span>Erstellt von:</span>
                                                    <span className="text-slate-700">{getUserDisplayName(formData.created_by)}</span>
                                                </div>
                                                {formData.updated_by && (
                                                    <div className="flex justify-between items-center py-2">
                                                        <span>Zuletzt bearbeitet von:</span>
                                                        <span className="text-slate-700">{getUserDisplayName(formData.updated_by)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}

                            {activeTab === "employment" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
                                    {/* Group: Vertrag & Position */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                <Briefcase className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Vertrag & Position</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Position / Funktion</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm"
                                                    value={formData.employment.position}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, position: e.target.value } })}
                                                    placeholder="z.B. Bauleiter, Geselle"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Anstellungsart</label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none"
                                                    value={formData.employment.status}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, status: e.target.value as EmploymentStatus } })}
                                                >
                                                    <option value="Vollzeit">Vollzeit</option>
                                                    <option value="Teilzeit">Teilzeit</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    Eintrittsdatum <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.startDate}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, startDate: e.target.value } })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Gehalt / Lohn (Netto/Brutto)</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.salary}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, salary: e.target.value } })}
                                                    placeholder="z.B. 3.500 € / Monat"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Group: Klassifizierung */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                                <Activity className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Klassifizierung & Urlaub</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Arbeitsverhältnis</label>
                                                <select
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none"
                                                    value={formData.employment.workerType}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, workerType: e.target.value as any } })}
                                                >
                                                    <option value="Arbeiter">Arbeiter</option>
                                                    <option value="Angestellter">Angestellter</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">KV-Einstufung (Lohngruppe)</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.classification}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, classification: e.target.value } })}
                                                    placeholder="z.B. LG 2a / Schlosser"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Urlaubsausmaß (Tage/Jahr)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.annualLeave}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, annualLeave: parseInt(e.target.value) || 0 } })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Verwendung im Betrieb</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.verwendung}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, verwendung: e.target.value } })}
                                                    placeholder="z.B. Montage-Teamleiter"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Group: Austritt */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                                <LogOut className="h-4 w-4 text-rose-600" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Austrittsinformationen</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Austrittsdatum (optional)</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.employment.endDate || ""}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, endDate: e.target.value } })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Austrittsgrund</label>
                                                <select
                                                    disabled={!formData.employment.endDate}
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm appearance-none disabled:opacity-50"
                                                    value={formData.employment.exitReason || ""}
                                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, exitReason: e.target.value } })}
                                                >
                                                    <option value="">Grund wählen...</option>
                                                    <option value="Selbst gekündigt">Selbst gekündigt</option>
                                                    <option value="Wurde gekündigt">Wurde gekündigt</option>
                                                    <option value="Vorübergehend / Winterpause">Vorübergehend / Winterpause</option>
                                                    <option value="Einvernehmliche Lösung">Einvernehmliche Lösung</option>
                                                    <option value="Rente / Pension">Rente / Pension</option>
                                                    <option value="Sonstiges">Sonstiges</option>
                                                </select>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === "schedule" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                    <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 mb-6">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                                <Clock className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <h4 className="text-indigo-900 font-black text-xl">Arbeitszeitmodell</h4>
                                        </div>
                                        <p className="text-indigo-600/70 font-medium ml-14">Hinterlegen Sie hier die vertraglichen Arbeitszeiten für die automatische Abrechnung.</p>
                                    </div>

                                    <label className="flex items-center justify-between gap-6 p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-100 transition-colors">
                                        <div>
                                            <h5 className="text-base font-black text-slate-900">Keine Zeiterfassung nötig</h5>
                                            <p className="text-sm font-medium text-slate-500 mt-1">
                                                Wenn aktiviert, erscheint dieser Mitarbeiter nicht in der Zeiterfassung.
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.additionalInfo?.noTimeTrackingRequired === true}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                additionalInfo: {
                                                    ...prev.additionalInfo,
                                                    noTimeTrackingRequired: e.target.checked
                                                }
                                            }))}
                                            className="h-6 w-6 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                        />
                                    </label>

                                    <div className="grid grid-cols-1 gap-4 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                        {[
                                            { key: 'monday', label: 'Montag' },
                                            { key: 'tuesday', label: 'Dienstag' },
                                            { key: 'wednesday', label: 'Mittwoch' },
                                            { key: 'thursday', label: 'Donnerstag' },
                                            { key: 'friday', label: 'Freitag' },
                                            { key: 'saturday', label: 'Samstag' },
                                            { key: 'sunday', label: 'Sonntag' },
                                        ].map(({ key, label }) => {
                                            const daySchedule = formData.weeklySchedule?.[key as keyof typeof formData.weeklySchedule] || { enabled: true, hours: 8 };

                                            return (
                                                <div key={key} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl shadow-sm transition-all hover:border-indigo-100 group">
                                                    <div className="flex items-center gap-6">
                                                        <div className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={daySchedule.enabled}
                                                                onChange={(e) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        weeklySchedule: {
                                                                            monday: { enabled: true, hours: 8 },
                                                                            tuesday: { enabled: true, hours: 8 },
                                                                            wednesday: { enabled: true, hours: 8 },
                                                                            thursday: { enabled: true, hours: 8 },
                                                                            friday: { enabled: true, hours: 8 },
                                                                            saturday: { enabled: false, hours: 0 },
                                                                            sunday: { enabled: false, hours: 0 },
                                                                            ...prev.weeklySchedule,
                                                                            [key]: {
                                                                                enabled: e.target.checked,
                                                                                hours: daySchedule.hours
                                                                            }
                                                                        }
                                                                    }));
                                                                }}
                                                                className="h-6 w-6 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                                            />
                                                        </div>
                                                        <span className={cn("font-black text-base min-w-[120px]", daySchedule.enabled ? "text-slate-800" : "text-slate-300")}>
                                                            {label}
                                                        </span>
                                                    </div>

                                                    {daySchedule.enabled ? (
                                                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                max="24"
                                                                value={daySchedule.hours}
                                                                onChange={(e) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        weeklySchedule: {
                                                                            monday: { enabled: true, hours: 8 },
                                                                            tuesday: { enabled: true, hours: 8 },
                                                                            wednesday: { enabled: true, hours: 8 },
                                                                            thursday: { enabled: true, hours: 8 },
                                                                            friday: { enabled: true, hours: 8 },
                                                                            saturday: { enabled: false, hours: 0 },
                                                                            sunday: { enabled: false, hours: 0 },
                                                                            ...prev.weeklySchedule,
                                                                            [key]: {
                                                                                enabled: daySchedule.enabled,
                                                                                hours: parseFloat(e.target.value) || 0
                                                                            }
                                                                        }
                                                                    }));
                                                                }}
                                                                className="w-16 bg-transparent text-center font-black text-indigo-600 outline-none"
                                                            />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stunden</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest pr-4">Frei</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === "bank" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Bankverbindung</h3>
                                            <p className="text-sm text-slate-500 font-medium">Lohnauszahlungen erfolgen an dieses Konto.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8 p-8 rounded-[3rem] bg-slate-50/30 border border-slate-100 shadow-sm">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Name der Bank</label>
                                            <input
                                                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm"
                                                value={formData.bankDetails.bankName}
                                                onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                                                placeholder="z.B. Sparkasse, Raiffeisenbank"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">
                                                    IBAN <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black font-mono uppercase tracking-wider shadow-sm"
                                                    value={formData.bankDetails.iban}
                                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, iban: e.target.value } })}
                                                    placeholder="AT00 0000 0000 0000 0000"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">BIC (SWIFT)</label>
                                                <input
                                                    className="w-full px-6 py-5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black font-mono uppercase tracking-wider shadow-sm"
                                                    value={formData.bankDetails.bic}
                                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bic: e.target.value } })}
                                                    placeholder="RZBA AT WW"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === "documents" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 space-y-10">
                                    <section className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 font-medium">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                <Shield className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <h4 className="text-indigo-900 font-black text-xl">Dokumenten-Management</h4>
                                        </div>
                                        <p className="text-indigo-600 border-l-2 border-indigo-200 pl-6 py-1 font-medium italic">
                                            {EU_EWR_COUNTRIES.includes(formData.personalData.nationality)
                                                ? "Als EU/EWR-Staatsbürger benötigen wir einen Identitätsnachweis (Pass oder Ausweis) sowie die Standard-Unterlagen."
                                                : "Für Nicht-EU/EWR-Staatsbürger ist ein Reisepass und ein Aufenthaltstitel zwingend erforderlich."}
                                        </p>

                                        {initialEmployee && (
                                            <div className="mt-8 pt-6 border-t border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div>
                                                    <p className="text-indigo-900 font-black">Dienstzettel generieren</p>
                                                    <p className="text-indigo-600/60 text-xs font-medium">Erstellt ein aktuelles Dienstzettel-PDF basierend auf den Anstellungsdaten.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const missingContractFields = !formData.employment.salary ||
                                                            !formData.employment.classification ||
                                                            !formData.employment.verwendung ||
                                                            !formData.employment.startDate ||
                                                            !formData.employment.position;

                                                        if (missingContractFields) {
                                                            showConfirm({
                                                                title: "Daten unvollständig",
                                                                message: "Es fehlen Pflichtangaben für den Dienstzettel. Bitte füllen Sie zuerst alle Felder im Tab 'Anstellung' aus.",
                                                                confirmLabel: "Zu den Daten",
                                                                cancelLabel: "Abbrechen",
                                                                onConfirm: () => setActiveTab("employment"),
                                                                variant: 'primary'
                                                            });
                                                            return;
                                                        }
                                                        onGenerateContract?.(formData);
                                                    }}
                                                    className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    Jetzt erstellen
                                                </button>
                                            </div>
                                        )}
                                    </section>

                                    <div className="grid grid-cols-1 gap-6">
                                        <section>
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-4">Identitätsnachweise</h5>
                                            <div className="grid grid-cols-1 gap-4 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                                <DocumentSlot
                                                    label="Reisepass"
                                                    required={!EU_EWR_COUNTRIES.includes(formData.personalData.nationality)}
                                                    subType="passport"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'passport', 'Reisepass')}
                                                    onRemove={handleRemoveSlotDocument}
                                                    onPreview={handlePreview}
                                                />

                                                {EU_EWR_COUNTRIES.includes(formData.personalData.nationality) ? (
                                                    <DocumentSlot
                                                        label="Personalausweis"
                                                        subType="id_card"
                                                        documents={formData.documents}
                                                        onUpload={(e) => handleSlotUpload(e, 'id_card', 'Personalausweis')}
                                                        onRemove={handleRemoveSlotDocument}
                                                        onPreview={handlePreview}
                                                    />
                                                ) : (
                                                    <DocumentSlot
                                                        label="Aufenthaltstitel"
                                                        required={true}
                                                        subType="residence_permit"
                                                        documents={formData.documents}
                                                        onUpload={(e) => handleSlotUpload(e, 'residence_permit', 'Aufenthaltstitel')}
                                                        onRemove={handleRemoveSlotDocument}
                                                        onPreview={handlePreview}
                                                    />
                                                )}
                                            </div>
                                        </section>

                                        <section>
                                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 mb-4">Meldung & Versicherung</h5>
                                            <div className="grid grid-cols-1 gap-4 p-6 rounded-[2.5rem] bg-slate-50/30 border border-slate-100">
                                                <DocumentSlot
                                                    label="Meldezettel"
                                                    subType="meldezettel"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'meldezettel', 'Meldezettel')}
                                                    onRemove={handleRemoveSlotDocument}
                                                    onPreview={handlePreview}
                                                />
                                                <DocumentSlot
                                                    label="E-Card (Vorne)"
                                                    subType="ecard"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'ecard', 'E-Card')}
                                                    onRemove={handleRemoveSlotDocument}
                                                    onPreview={handlePreview}
                                                />
                                                <DocumentSlot
                                                    label="Bankomatkarte"
                                                    subType="bank_card"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'bank_card', 'Bankomatkarte')}
                                                    onRemove={handleRemoveSlotDocument}
                                                    onPreview={handlePreview}
                                                />
                                            </div>
                                        </section>

                                        <section>
                                            <div className="flex items-center justify-between mb-4 px-1">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Freigegebene App-Ordner</h5>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = prompt("Name des neuen Ordners:");
                                                        if (name) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                sharedFolders: [...(prev.sharedFolders || []), name]
                                                            }));
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Neuer Ordner
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                {(formData.sharedFolders || []).map((folderName, idx) => (
                                                    <FolderSection
                                                        key={idx}
                                                        title={folderName}
                                                        folder={folderName}
                                                        documents={formData.documents.filter(d => d.folder === folderName)}
                                                        onUpload={(files) => handleSharedUpload(files, folderName)}
                                                        onDeleteDoc={(docId) => setFormData(prev => ({
                                                            ...prev,
                                                            documents: prev.documents.filter(d => d.id !== docId)
                                                        }))}
                                                        onDeleteFolder={() => {
                                                            showConfirm({
                                                                title: "Ordner löschen",
                                                                message: `Ordner "${folderName}" wirklich löschen? Alle enthaltenen Dokumente werden ebenfalls gelöscht.`,
                                                                confirmLabel: "Löschen",
                                                                cancelLabel: "Abbrechen",
                                                                variant: "danger",
                                                                onConfirm: () => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        sharedFolders: (prev.sharedFolders || []).filter(f => f !== folderName),
                                                                        documents: prev.documents.filter(d => d.folder !== folderName)
                                                                    }));
                                                                }
                                                            });
                                                        }}
                                                        onPreview={handlePreview}
                                                    />
                                                ))}
                                                {(!formData.sharedFolders || formData.sharedFolders.length === 0) && (
                                                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                                        <Folder className="h-10 w-10 text-slate-300 mb-3" />
                                                        <p className="text-sm font-bold text-slate-600 mb-1">Keine Ordner vorhanden</p>
                                                        <p className="text-xs text-slate-400 max-w-sm mb-4">Erstellen Sie Ordner (z.B. &quot;Lohnzettel&quot;), um Dokumente hochzuladen und für den Mitarbeiter in der App freizugeben.</p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const name = prompt("Name des neuen Ordners:");
                                                                if (name) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        sharedFolders: [...(prev.sharedFolders || []), name]
                                                                    }));
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Ersten Ordner erstellen
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}


                            {activeTab === "app-access" && (
                                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 py-16 flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="h-24 w-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                                        <Smartphone className="h-10 w-10 text-slate-300 animate-pulse" />
                                    </div>
                                    <div className="space-y-2 max-w-md">
                                        <h3 className="text-xl font-black text-slate-800">Mobile App-Zugriff</h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                            Dieses Feature befindet sich aktuell in der Entwicklung und wird in Kürze freigeschaltet.
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full animate-pulse">
                                        In Arbeit
                                    </span>
                                </div>
                            )}

                        </form>

                        {/* Footer */}
                        <div className="relative z-20 flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl bg-slate-100 px-6 py-3.5 text-sm font-black text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                className="min-w-[220px] rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-7 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                {initialEmployee ? "Änderungen speichern" : "Mitarbeiter anlegen"}
                            </button>
                        </div>
                    </div>
                </div>

                <DocumentPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    document={previewDoc}
                />
            </div>
        </div>
    );
}

interface DocumentSlotProps {
    label: string;
    required?: boolean;
    subType: string;
    documents: EmployeeDocument[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (id: string) => void;
    onPreview: (doc: EmployeeDocument) => void;
}

function DocumentSlot({ label, required, subType, documents = [], onUpload, onRemove, onPreview }: DocumentSlotProps) {
    const docs = documents?.filter(d => d.subType === subType) || [];
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={cn(
            "flex flex-col p-5 rounded-[20px] transition-all border-2 border-dashed gap-4",
            docs.length > 0
                ? "bg-slate-50 border-slate-200"
                : required
                    ? "bg-rose-50/30 border-rose-200"
                    : "bg-white border-slate-100 hover:border-indigo-200"
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                        docs.length > 0 ? "bg-indigo-600 text-white" : required ? "bg-rose-100 text-rose-500" : "bg-slate-100 text-slate-400"
                    )}>
                        {docs.length > 0 ? <FileText className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{label}</span>
                            {required && docs.length === 0 && <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Erforderlich</span>}
                            {docs.length > 0 && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{docs.length} Hochgeladen</span>}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                            {docs.length > 0 ? `${docs.length} Datei(en) hinterlegt` : "Noch keine Datei ausgewählt"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="px-4 py-2.5 bg-white text-slate-600 border border-slate-100 hover:bg-slate-50 rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                        {docs.length > 0 ? "Weitere hinzufügen" : "Hochladen"}
                    </button>
                    <input
                        type="file"
                        ref={inputRef}
                        onChange={(e) => {
                            onUpload(e);
                            e.target.value = '';
                        }}
                        className="hidden"
                    />
                </div>
            </div>

            {docs.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-2">
                    {docs.map((doc) => (
                        <div 
                            key={doc.id} 
                            onClick={() => onPreview(doc)}
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-150 transition-all duration-150 cursor-pointer group/item group/doc"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 text-indigo-400 group-hover/doc:text-indigo-600 transition-colors">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-700 truncate group-hover/doc:text-indigo-650 transition-colors">{doc.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium">{doc.fileSize} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(doc.id);
                                    }}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface FolderSectionProps {
    title: string;
    folder?: string;
    documents: EmployeeDocument[];
    onUpload: (files: FileList | null) => void;
    onDeleteDoc: (id: string) => void;
    onDeleteFolder?: () => void;
    onRename?: () => void;
    onPreview: (doc: EmployeeDocument) => void;
}

function FolderSection({ title, folder, documents, onUpload, onDeleteDoc, onDeleteFolder, onRename, onPreview }: FolderSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                        <Folder className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {onRename && (
                        <button
                            type="button"
                            onClick={onRename}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition-all"
                        >
                            <Plus className="h-4 w-4 rotate-45" />
                        </button>
                    )}
                    {onDeleteFolder && (
                        <button
                            type="button"
                            onClick={onDeleteFolder}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                    >
                        <Upload className="h-3 w-3" />
                        Laden
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            onUpload(e.target.files);
                            e.target.value = ''; // Reset for re-upload
                        }}
                    />
                </div>
            </div>
            <div className="p-6">
                {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {documents.map(doc => (
                            <div 
                                key={doc.id} 
                                onClick={() => onPreview(doc)}
                                className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-indigo-150 transition-all duration-150 cursor-pointer group/doc"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm text-indigo-400 group-hover/doc:text-indigo-600 transition-colors">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-700 truncate group-hover/doc:text-indigo-650 transition-colors">{doc.name}</p>
                                        <p className="text-[9px] text-slate-400 font-medium">{doc.fileSize}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteDoc(doc.id);
                                        }}
                                        className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                        <Folder className="h-8 w-8 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ordner ist leer</span>
                    </div>
                )}
            </div>
        </div>
    );
}
