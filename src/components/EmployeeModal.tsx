"use client";

import React, { useState, useEffect } from "react";
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
    Share2
} from "lucide-react";
import { Employee, EmploymentStatus, EmployeeDocument } from "@/types/employee";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { useNotification } from "@/context/NotificationContext";

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
    { id: "shared_docs", label: "Geteilte Docs", icon: Share2 },
    { id: "access", label: "App-Zugriff", icon: Smartphone }
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
                documents: initialEmployee.documents || [],
                appAccess: initialEmployee.appAccess || {
                    staffId: initialEmployee.employeeNumber || "",
                    accessPIN: "",
                    isAccessEnabled: false,
                    permissions: {
                        timeTracking: true,
                        documents: false,
                        personalData: true
                    }
                }
            });
        } else {
            const nextNum = getNextNumber ? getNextNumber() : "";
            setFormData({
                id: Math.random().toString(36).substr(2, 9),
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
                    staffId: nextNum,
                    accessPIN: "",
                    isAccessEnabled: false,
                    permissions: {
                        timeTracking: true,
                        documents: false,
                        personalData: true
                    }
                }
            });
        }
    }, [initialEmployee, isOpen]);

    const generatePIN = () => {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        setFormData(prev => ({
            ...prev,
            appAccess: {
                ...(prev.appAccess || {
                    staffId: prev.employeeNumber,
                    isAccessEnabled: false,
                    permissions: { timeTracking: true, documents: false, personalData: true }
                }),
                accessPIN: pin
            }
        }));
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
                        folder: folder
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
            showToast(`${newDocs.length} Dokument(e) erfolgreich hochgeladen.`, 'success');
        } catch (error) {
            console.error("Upload failed:", error);
            showToast("Fehler beim Hochladen der Dokumente.", 'error');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for Non-EU Passport
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

        // Dienstzettel Validation (only for new employees or if being generated)
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
                    onSave(formData, true);
                    onClose();
                },
                variant: 'primary'
            });
            return;
        }

        onSave(formData);
        onClose();
    };


    const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, subType: string, customName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            const extension = file.name.split('.').pop();
            const fileName = `${customName}.${extension}`;

            const newDoc: EmployeeDocument = {
                id: Math.random().toString(36).substr(2, 9),
                name: fileName,
                type: file.type || "application/octet-stream",
                uploadDate: new Date().toISOString(),
                fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                content: base64,
                category: 'upload',
                subType: subType
            };

            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents.filter(d => d.subType !== subType), newDoc]
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveSlotDocument = (subType: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.subType !== subType)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-6xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-5">
                        {formData.avatar ? (
                            <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-md ring-4 ring-indigo-50 border-2 border-white">
                                <img src={formData.avatar} alt="Profile" className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                                <User className="h-8 w-8" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 font-outfit leading-tight">
                                {initialEmployee ? "Mitarbeiter bearbeiten" : "Neuer Mitarbeiter"}
                            </h2>
                            <p className="text-slate-500 text-sm font-medium">#{formData.employeeNumber || "---"} • Personalakte</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-slate-50/50 border-r border-slate-100 flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-hide">
                        <div className="flex md:flex-col w-full p-2 md:p-4 gap-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm h-12 whitespace-nowrap md:whitespace-normal",
                                            active
                                                ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                                        )}
                                    >
                                        <Icon className={cn("h-5 w-5 shrink-0", active ? "text-indigo-600" : "text-slate-300")} />
                                        <span className="hidden md:block">{tab.label}</span>
                                        <span className="md:hidden text-xs">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right side: Form + Footer */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-10">
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Vorname</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold shadow-sm"
                                                    value={formData.personalData.firstName}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, firstName: e.target.value } })}
                                                    placeholder="z.B. Max"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Nachname</label>
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
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, phone: e.target.value } })}
                                                    placeholder="+43 664 1234567"
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Geburtsdatum</label>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Geburtsort</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.birthPlace}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthPlace: e.target.value } })}
                                                    placeholder="z.B. Berlin"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Geburtsland</label>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Staatsangehörigkeit</label>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Anschrift</label>
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
                                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, zip: e.target.value } })}
                                                        placeholder="PLZ"
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Sozialversicherungsnummer</label>
                                                <input
                                                    className="w-full px-5 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                                                    value={formData.personalData.socialSecurityNumber}
                                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, socialSecurityNumber: e.target.value } })}
                                                    placeholder="z.B. 1234 010185"
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
                                                    <option value="Minijob">Minijob</option>
                                                    <option value="Werkstudent">Werkstudent</option>
                                                    <option value="Auszubildender">Auszubildender</option>
                                                    <option value="Freelancer">Freelancer</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Eintrittsdatum</label>
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
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">IBAN</label>
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
                                                    onRemove={() => handleRemoveSlotDocument('passport')}
                                                    onPreview={handlePreview}
                                                />

                                                {EU_EWR_COUNTRIES.includes(formData.personalData.nationality) ? (
                                                    <DocumentSlot
                                                        label="Personalausweis"
                                                        subType="id_card"
                                                        documents={formData.documents}
                                                        onUpload={(e) => handleSlotUpload(e, 'id_card', 'Personalausweis')}
                                                        onRemove={() => handleRemoveSlotDocument('id_card')}
                                                        onPreview={handlePreview}
                                                    />
                                                ) : (
                                                    <DocumentSlot
                                                        label="Aufenthaltstitel"
                                                        required={true}
                                                        subType="residence_permit"
                                                        documents={formData.documents}
                                                        onUpload={(e) => handleSlotUpload(e, 'residence_permit', 'Aufenthaltstitel')}
                                                        onRemove={() => handleRemoveSlotDocument('residence_permit')}
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
                                                    onRemove={() => handleRemoveSlotDocument('meldezettel')}
                                                    onPreview={handlePreview}
                                                />
                                                <DocumentSlot
                                                    label="E-Card (Vorne)"
                                                    subType="ecard"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'ecard', 'E-Card')}
                                                    onRemove={() => handleRemoveSlotDocument('ecard')}
                                                    onPreview={handlePreview}
                                                />
                                                <DocumentSlot
                                                    label="Bankomatkarte"
                                                    subType="bank_card"
                                                    documents={formData.documents}
                                                    onUpload={(e) => handleSlotUpload(e, 'bank_card', 'Bankomatkarte')}
                                                    onRemove={() => handleRemoveSlotDocument('bank_card')}
                                                    onPreview={handlePreview}
                                                />
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {activeTab === "shared_docs" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 space-y-10">
                                    <section className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 font-medium">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                                    <Share2 className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <h4 className="text-indigo-900 font-black text-xl">Dokumente für die Mobile App</h4>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    showPrompt({
                                                        title: "Neuer Ordner",
                                                        message: "Geben Sie einen Namen für den neuen Dokumenten-Ordner ein.",
                                                        placeholder: "z.B. Lohnzettel 2024",
                                                        confirmLabel: "Ordner erstellen",
                                                        onConfirm: (folderName) => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                sharedFolders: [...(prev.sharedFolders || []), folderName]
                                                            }));
                                                        }
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Neuer Ordner
                                            </button>
                                        </div>
                                        <p className="text-indigo-600 border-l-2 border-indigo-200 pl-6 py-1 font-medium italic">
                                            Erstellen Sie Ordner und laden Sie Dokumente hoch, die der Mitarbeiter in seiner App sehen soll.
                                        </p>

                                        <div className="mt-8 space-y-6">
                                            {/* General Documents (Unfolderd) */}
                                            <FolderSection
                                                title="Allgemeine Dokumente"
                                                folder={undefined}
                                                documents={formData.documents.filter(d => d.category === 'hr_shared' && !d.folder)}
                                                onUpload={(files) => handleSharedUpload(files)}
                                                onDeleteDoc={(id) => setFormData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }))}
                                                onPreview={handlePreview}
                                            />

                                            {/* Folder Sections */}
                                            {(formData.sharedFolders || []).map(folderName => (
                                                <FolderSection
                                                    key={folderName}
                                                    title={folderName}
                                                    folder={folderName}
                                                    documents={formData.documents.filter(d => d.category === 'hr_shared' && d.folder === folderName)}
                                                    onUpload={(files) => handleSharedUpload(files, folderName)}
                                                    onDeleteDoc={(id) => setFormData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }))}
                                                    onDeleteFolder={() => {
                                                        showConfirm({
                                                            title: "Ordner löschen",
                                                            message: `Ordner "${folderName}" wirklich löschen? Alle Dokumente darin werden ebenfalls entfernt.`,
                                                            confirmLabel: "Löschen",
                                                            variant: 'danger',
                                                            onConfirm: () => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    sharedFolders: prev.sharedFolders?.filter(f => f !== folderName),
                                                                    documents: prev.documents.filter(d => d.folder !== folderName || d.category !== 'hr_shared')
                                                                }));
                                                            }
                                                        });
                                                    }}
                                                    onRename={() => {
                                                        showPrompt({
                                                            title: "Ordner umbenennen",
                                                            message: "Geben Sie einen neuen Namen für den Ordner ein.",
                                                            initialValue: folderName,
                                                            confirmLabel: "Speichern",
                                                            onConfirm: (newName) => {
                                                                if (newName !== folderName) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        sharedFolders: prev.sharedFolders?.map(f => f === folderName ? newName : f),
                                                                        documents: prev.documents.map(d => d.folder === folderName ? { ...d, folder: newName } : d)
                                                                    }));
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    onPreview={handlePreview}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === "access" && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10 space-y-10">
                                    <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -ml-16 -mb-16" />

                                        <div className="relative z-10">
                                            <div className="flex items-center gap-5 mb-6">
                                                <div className="h-14 w-14 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                    <Smartphone className="h-8 w-8 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-3xl font-black tracking-tight leading-none">Mitarbeiter-App</h4>
                                                    <p className="text-indigo-200 mt-2 font-medium">Digitaler Zugang & Zeiterfassung</p>
                                                </div>
                                            </div>
                                            <p className="text-slate-400 max-w-lg leading-relaxed font-medium">
                                                Ermöglichen Sie Ihrem Team den Zugriff auf die mobile FlowY App für iPhones und Android-Geräte.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1 space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Status</label>
                                            <div
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    appAccess: {
                                                        ...(prev.appAccess || {
                                                            staffId: prev.employeeNumber,
                                                            accessPIN: "",
                                                            isAccessEnabled: false,
                                                            permissions: { timeTracking: true, documents: false, personalData: true }
                                                        }),
                                                        isAccessEnabled: !prev.appAccess?.isAccessEnabled
                                                    }
                                                }))}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer h-full gap-4",
                                                    formData.appAccess?.isAccessEnabled
                                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                                        : "bg-slate-50 border-slate-100 text-slate-400"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                                                    formData.appAccess?.isAccessEnabled ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-200 text-slate-400"
                                                )}>
                                                    <Shield className="h-6 w-6" />
                                                </div>
                                                <span className="font-black uppercase tracking-widest text-xs text-center">{formData.appAccess?.isAccessEnabled ? "Aktiviert" : "Deaktiviert"}</span>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Personalnummer (Login-ID)</label>
                                            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex items-center justify-center">
                                                <span className="text-4xl font-black text-slate-800 tracking-[0.2em]">
                                                    {formData.employeeNumber || "----"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <section className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sicherheits-PIN</label>
                                            <button
                                                type="button"
                                                onClick={generatePIN}
                                                className="text-indigo-600 font-bold text-xs hover:text-indigo-700 transition-colors"
                                            >
                                                Neu generieren
                                            </button>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1 p-10 bg-slate-50 border border-slate-100 rounded-[3rem] flex items-center justify-center gap-4 relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {formData.appAccess?.accessPIN ? (
                                                    formData.appAccess.accessPIN.split('').map((digit, idx) => (
                                                        <div key={idx} className="w-12 h-16 bg-white border-2 border-indigo-100 rounded-2xl flex items-center justify-center text-3xl font-black text-indigo-600 shadow-sm animate-in zoom-in-95 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                            {digit}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex gap-4">
                                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                                            <div key={i} className="w-12 h-16 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-200 text-3xl font-black">
                                                                ?
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <Activity className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <p className="text-[10px] text-orange-700 font-bold leading-tight">
                                                DIESER CODE WIRD NUR EINMAL ANGEZEIGT. NOTIEREN SIE DEN PIN FÜR DEN MITARBEITER.
                                            </p>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Berechtigungen & Funktionen</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { id: 'timeTracking', label: 'Mobile Zeiterfassung', desc: 'Arbeitszeiten erfassen & Urlaub beantragen', icon: Clock, color: 'indigo' },
                                                { id: 'personalData', label: 'Stammdaten-Änderung', desc: 'Adressdaten & Bankverbindung anpassen', icon: User, color: 'emerald' },
                                                { id: 'documents', label: 'Dokumenten-Einsicht', desc: 'Lohnzettel & Verträge am Handy sehen', icon: FileText, color: 'orange' },
                                            ].map((perm) => (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => {
                                                        const currentPerms = formData.appAccess?.permissions || { timeTracking: true, documents: false, personalData: true };
                                                        setFormData({
                                                            ...formData,
                                                            appAccess: {
                                                                ...(formData.appAccess || {
                                                                    staffId: formData.employeeNumber,
                                                                    accessPIN: "",
                                                                    isAccessEnabled: false,
                                                                    permissions: { timeTracking: true, documents: false, personalData: true }
                                                                }),
                                                                permissions: {
                                                                    ...currentPerms,
                                                                    [perm.id]: !currentPerms[perm.id as keyof typeof currentPerms]
                                                                }
                                                            }
                                                        });
                                                    }}
                                                    className={cn(
                                                        "p-6 rounded-[2.5rem] border-2 flex items-center gap-6 cursor-pointer transition-all",
                                                        (formData.appAccess?.permissions as any)?.[perm.id]
                                                            ? "bg-white border-indigo-100 shadow-xl shadow-indigo-500/5"
                                                            : "bg-slate-50 border-slate-100 opacity-60 grayscale"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                                        (formData.appAccess?.permissions as any)?.[perm.id]
                                                            ? `bg-${perm.color}-50 text-${perm.color}-600`
                                                            : "bg-white text-slate-300"
                                                    )}>
                                                        <perm.icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-black text-slate-800 text-lg leading-tight">{perm.label}</div>
                                                        <div className="text-xs text-slate-400 font-medium mt-1">{perm.desc}</div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                        (formData.appAccess?.permissions as any)?.[perm.id]
                                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                                            : "bg-white border-slate-200"
                                                    )}>
                                                        {(formData.appAccess?.permissions as any)?.[perm.id] && <Plus className="h-4 w-4 rotate-45" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="px-10 py-8 border-t border-slate-100 flex justify-end gap-4 bg-white relative z-20">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 py-4 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                className="bg-indigo-600 text-white min-w-[220px] py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all"
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
    onRemove: () => void;
    onPreview: (doc: EmployeeDocument) => void;
}

function DocumentSlot({ label, required, subType, documents = [], onUpload, onRemove, onPreview }: DocumentSlotProps) {
    const doc = documents?.find(d => d.subType === subType);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className={cn(
            "flex items-center justify-between p-5 rounded-[20px] transition-all border-2 border-dashed",
            doc
                ? "bg-slate-50 border-slate-200"
                : required
                    ? "bg-rose-50/30 border-rose-200"
                    : "bg-white border-slate-100 hover:border-indigo-200"
        )}>
            <div className="flex items-center gap-4">
                <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                    doc ? "bg-indigo-600 text-white" : required ? "bg-rose-100 text-rose-500" : "bg-slate-100 text-slate-400"
                )}>
                    {doc ? <FileText className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{label}</span>
                        {required && !doc && <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Erforderlich</span>}
                        {doc && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">Hochgeladen</span>}
                    </div>
                    {doc ? (
                        <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[250px]">{doc.name}</p>
                    ) : (
                        <p className="text-xs text-slate-400 font-medium">Noch keine Datei ausgewählt</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {doc ? (
                    <>
                        <button
                            type="button"
                            onClick={() => onPreview(doc)}
                            className="h-10 w-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                        >
                            <Eye className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={onRemove}
                            className="h-10 w-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className={cn(
                                "px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
                                required ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
                            )}
                        >
                            Hochladen
                        </button>
                        <input
                            type="file"
                            ref={inputRef}
                            onChange={onUpload}
                            className="hidden"
                        />
                    </>
                )}
            </div>
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
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm text-indigo-400">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                                        <p className="text-[9px] text-slate-400 font-medium">{doc.fileSize}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => onPreview(doc)}
                                        className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition-all"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDeleteDoc(doc.id)}
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
