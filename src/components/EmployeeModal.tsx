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
    Eye
} from "lucide-react";
import { Employee, EmploymentStatus, EmployeeDocument } from "@/types/employee";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee) => void;
    initialEmployee?: Employee;
    getNextNumber?: () => string;
}

const TABS = [
    { id: "personal", label: "Persönlich", icon: User },
    { id: "employment", label: "Anstellung", icon: Briefcase },
    { id: "schedule", label: "Zeiteinteilung", icon: Clock },
    { id: "bank", label: "Bankdaten", icon: CreditCard },
    { id: "documents", label: "Dokumente", icon: FileText }
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

export function EmployeeModal({ isOpen, onClose, onSave, initialEmployee, getNextNumber }: EmployeeModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState("personal");
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
            salary: "",
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
            setFormData(initialEmployee);
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
                    salary: "",
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
        }
    }, [initialEmployee, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation for Non-EU Passport
        const isEUEWR = EU_EWR_COUNTRIES.includes(formData.personalData.nationality);
        if (!isEUEWR) {
            const hasPassport = formData.documents.some(d => d.subType === 'passport');
            if (!hasPassport) {
                alert("Für Nicht-EU/EWR Staatsbürger muss zwingend ein Reisepass hochgeladen werden.");
                setActiveTab("documents");
                return;
            }
        }

        onSave(formData);
        onClose();
    };


    const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, subType: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;

            const newDoc: EmployeeDocument = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type || "application/octet-stream",
                uploadDate: new Date().toISOString(),
                fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                content: base64,
                category: 'upload',
                subType: subType
            };

            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents.filter(d => d.subType !== subType || d.category === 'system'), newDoc]
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveSlotDocument = (subType: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.subType !== subType || d.category === 'system')
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

            <div className="relative bg-white w-full max-w-3xl rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
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
                    <button onClick={onClose} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-slate-100 bg-slate-50/50">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm",
                                    active
                                        ? "border-indigo-600 text-indigo-600 bg-white"
                                        : "border-transparent text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                    {activeTab === "personal" && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Personalnummer</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600"
                                    value={formData.employeeNumber}
                                    onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })}
                                    placeholder="Wird automatisch vergeben"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Vorname</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.firstName}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, firstName: e.target.value } })}
                                    placeholder="z.B. Max"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nachname</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.lastName}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, lastName: e.target.value } })}
                                    placeholder="z.B. Mustermann"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Geburtsdatum
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.birthday}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthday: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Familienstand</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                    value={formData.personalData.maritalStatus}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, maritalStatus: e.target.value } })}
                                >
                                    <option value="Ledig">Ledig</option>
                                    <option value="Verheiratet">Verheiratet</option>
                                    <option value="Geschieden">Geschieden</option>
                                    <option value="Verwitwet">Verwitwet</option>
                                </select>
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Geburtsort</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.birthPlace}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthPlace: e.target.value } })}
                                    placeholder="z.B. Berlin"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Geburtsland</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                    value={formData.personalData.birthCountry}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthCountry: e.target.value } })}
                                >
                                    <option value="">Land wählen...</option>
                                    {EUROPEAN_COUNTRIES.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Staatsangehörigkeit</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                                    value={formData.personalData.nationality}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, nationality: e.target.value } })}
                                >
                                    <option value="">Staatsbürgerschaft wählen...</option>
                                    {EUROPEAN_COUNTRIES.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> E-Mail
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.email}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, email: e.target.value } })}
                                    placeholder="max@beispiel.com"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> Telefon
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.phone}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, phone: e.target.value } })}
                                    placeholder="+43 664 1234567"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Geburtsdatum
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.birthday}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, birthday: e.target.value } })}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <MapPin className="h-3 w-3" /> Adresse
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        value={formData.personalData.street}
                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, street: e.target.value } })}
                                        placeholder="Straße, Hausnummer"
                                    />
                                    <input
                                        className="col-span-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        value={formData.personalData.zip}
                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, zip: e.target.value } })}
                                        placeholder="PLZ"
                                    />
                                    <input
                                        className="col-span-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        value={formData.personalData.city}
                                        onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, city: e.target.value } })}
                                        placeholder="Stadt"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Shield className="h-3 w-3" /> Rentenversicherungsnr.
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.socialSecurityNumber}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, socialSecurityNumber: e.target.value } })}
                                    placeholder="z.B. 1234 010185"
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Stethoscope className="h-3 w-3" /> Krankenkasse
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.personalData.healthInsurance}
                                    onChange={e => setFormData({ ...formData, personalData: { ...formData.personalData, healthInsurance: e.target.value } })}
                                    placeholder="z.B. ÖGK, SVS, BVAEB"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "employment" && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Position</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.employment.position}
                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, position: e.target.value } })}
                                    placeholder="z.B. Bauleiter, Geselle"
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Status</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
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
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Eintrittsdatum
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.employment.startDate}
                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, startDate: e.target.value } })}
                                    required
                                />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                    <CreditCard className="h-3 w-3" /> Gehalt / Lohn
                                </label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.employment.salary}
                                    onChange={e => setFormData({ ...formData, employment: { ...formData.employment, salary: e.target.value } })}
                                    placeholder="z.B. 3.500 € / Monat"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === "schedule" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-6">
                                <h4 className="text-indigo-900 font-bold mb-1">Wochenarbeitszeit</h4>
                                <p className="text-indigo-600/70 text-sm font-medium">Definieren Sie die Standard-Arbeitszeiten für die automatische Zeiterfassung.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
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
                                        <div key={key} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                                            <div className="flex items-center gap-4">
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
                                                    className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500/20"
                                                />
                                                <span className={cn("font-bold text-sm min-w-[100px]", daySchedule.enabled ? "text-slate-900" : "text-slate-400")}>
                                                    {label}
                                                </span>
                                            </div>

                                            {daySchedule.enabled && (
                                                <div className="flex items-center gap-2">
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
                                                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-center font-bold text-slate-700 outline-none focus:border-indigo-500"
                                                    />
                                                    <span className="text-slate-400 text-sm font-medium">Std.</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === "bank" && (
                        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Bank Name</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                    value={formData.bankDetails.bankName}
                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: e.target.value } })}
                                    placeholder="z.B. Sparkasse, Deutsche Bank"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">IBAN</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium font-mono uppercase"
                                    value={formData.bankDetails.iban}
                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, iban: e.target.value } })}
                                    placeholder="AT00 0000 0000 0000 0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">BIC</label>
                                <input
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium font-mono uppercase"
                                    value={formData.bankDetails.bic}
                                    onChange={e => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bic: e.target.value } })}
                                    placeholder="RZBA AT WW"
                                />
                            </div>
                        </div>
                    )}
                    {activeTab === "documents" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                            {/* Required Documents Info */}
                            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-6 font-medium">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <Shield className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <h4 className="text-indigo-900 font-bold">Erforderliche Dokumente</h4>
                                </div>
                                <p className="text-indigo-600 border-l-2 border-indigo-200 pl-4 py-1">
                                    {EU_EWR_COUNTRIES.includes(formData.personalData.nationality)
                                        ? "Als EU/EWR-Staatsbürger benötigen wir einen Identitätsnachweis (Pass oder Ausweis) sowie die Standard-Unterlagen."
                                        : "Für Nicht-EU/EWR-Staatsbürger ist ein Reisepass und ein Aufenthaltstitel zwingend erforderlich."}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Conditional Passport Slot */}
                                <DocumentSlot
                                    label="Reisepass"
                                    required={!EU_EWR_COUNTRIES.includes(formData.personalData.nationality)}
                                    subType="passport"
                                    documents={formData.documents}
                                    onUpload={(e) => handleSlotUpload(e, 'passport')}
                                    onRemove={() => handleRemoveSlotDocument('passport')}
                                    onPreview={handlePreview}
                                />

                                {/* Conditional ID Card / Residence Permit */}
                                {EU_EWR_COUNTRIES.includes(formData.personalData.nationality) ? (
                                    <DocumentSlot
                                        label="Personalausweis"
                                        subType="id_card"
                                        documents={formData.documents}
                                        onUpload={(e) => handleSlotUpload(e, 'id_card')}
                                        onRemove={() => handleRemoveSlotDocument('id_card')}
                                        onPreview={handlePreview}
                                    />
                                ) : (
                                    <DocumentSlot
                                        label="Aufenthaltstitel"
                                        required={true}
                                        subType="residence_permit"
                                        documents={formData.documents}
                                        onUpload={(e) => handleSlotUpload(e, 'residence_permit')}
                                        onRemove={() => handleRemoveSlotDocument('residence_permit')}
                                        onPreview={handlePreview}
                                    />
                                )}

                                <div className="h-px bg-slate-100 my-4" />
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-none mb-1">Allgemeine Unterlagen</h5>

                                {/* Standard Slots */}
                                <DocumentSlot
                                    label="Meldezettel"
                                    subType="meldezettel"
                                    documents={formData.documents}
                                    onUpload={(e) => handleSlotUpload(e, 'meldezettel')}
                                    onRemove={() => handleRemoveSlotDocument('meldezettel')}
                                    onPreview={handlePreview}
                                />
                                <DocumentSlot
                                    label="Bankomatkarte"
                                    subType="bank_card"
                                    documents={formData.documents}
                                    onUpload={(e) => handleSlotUpload(e, 'bank_card')}
                                    onRemove={() => handleRemoveSlotDocument('bank_card')}
                                    onPreview={handlePreview}
                                />
                                <DocumentSlot
                                    label="E-Card"
                                    subType="ecard"
                                    documents={formData.documents}
                                    onUpload={(e) => handleSlotUpload(e, 'ecard')}
                                    onRemove={() => handleRemoveSlotDocument('ecard')}
                                    onPreview={handlePreview}
                                />
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 transition-all"
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="bg-primary-gradient text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        {initialEmployee ? "Speichern" : "Mitarbeiter anlegen"}
                    </button>
                </div>
            </div>

            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={previewDoc}
            />
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

function DocumentSlot({ label, required, subType, documents, onUpload, onRemove, onPreview }: DocumentSlotProps) {
    const doc = documents.find(d => d.subType === subType);
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
