"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useEmployees } from "@/hooks/useEmployees"
import { useNotification } from "@/context/NotificationContext"
import { useCompanySettings } from "@/hooks/useCompanySettings"
import {
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Save,
    LogOut,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    ChevronDown,
    Building2,
    ShieldCheck,
    FileText,
    Eye,
    Download,
    Calendar,
    Folder,
    Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DocumentPreviewModal } from "@/components/DocumentPreviewModal"
import { EmployeeDocument } from "@/types/employee"

export default function MobileProfile() {
    const { currentEmployee, refreshEmployee, logoutEmployee } = useAuth()
    const { requestEmployeeUpdate } = useEmployees()
    const { showToast } = useNotification()
    const { data: companyData } = useCompanySettings()

    const [expandedSection, setExpandedSection] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Auto-refresh on focus
    useEffect(() => {
        const handleFocus = () => refreshEmployee();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refreshEmployee]);

    // Document state
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    // Local state for editing
    const [formData, setFormData] = useState({
        firstName: currentEmployee?.personalData.firstName || "",
        lastName: currentEmployee?.personalData.lastName || "",
        phone: currentEmployee?.personalData.phone || "",
        email: currentEmployee?.personalData.email || "",
        street: currentEmployee?.personalData.street || "",
        city: currentEmployee?.personalData.city || "",
        zip: currentEmployee?.personalData.zip || "",
        iban: currentEmployee?.bankDetails.iban || ""
    })

    // Group documents by folder for employee view - ONLY shared documents
    const groupedDocuments = useMemo(() => {
        if (!currentEmployee) return {};
        const shared = currentEmployee.documents.filter(doc => doc.category === 'hr_shared');
        const groups: Record<string, EmployeeDocument[]> = {};

        // General documents (no folder)
        const general = shared.filter(d => !d.folder);
        if (general.length > 0) groups["Allgemeine Dokumente"] = general;

        // Documents in shared folders
        (currentEmployee.sharedFolders || []).forEach(folderName => {
            const docs = shared.filter(d => d.folder === folderName);
            groups[folderName] = docs; // Include folder even if empty
        });

        // Catch documents that have a folder name not in sharedFolders (just in case)
        shared.forEach(doc => {
            if (doc.folder && !groups[doc.folder] && !(currentEmployee.sharedFolders || []).includes(doc.folder)) {
                if (!groups[doc.folder]) groups[doc.folder] = [];
                groups[doc.folder].push(doc);
            }
        });

        return groups;
    }, [currentEmployee]);

    // Check if form is dirty
    const isDirty = useMemo(() => {
        if (!currentEmployee) return false;
        return (
            formData.phone !== (currentEmployee.personalData.phone || "") ||
            formData.email !== (currentEmployee.personalData.email || "") ||
            formData.street !== (currentEmployee.personalData.street || "") ||
            formData.city !== (currentEmployee.personalData.city || "") ||
            formData.zip !== (currentEmployee.personalData.zip || "") ||
            formData.iban !== (currentEmployee.bankDetails.iban || "")
        );
    }, [formData, currentEmployee]);

    if (!currentEmployee) return null

    const permissions = currentEmployee.appAccess?.permissions
    const hasPendingChanges = !!currentEmployee.pendingChanges
    const documents = currentEmployee.documents || []

    const toggleSection = (id: string) => {
        setExpandedSection(expandedSection === id ? null : id)
    }

    const handleSave = async () => {
        setIsSaving(true)

        const pendingChanges: any = {};
        const personalChanges: any = {};
        if (formData.firstName !== currentEmployee.personalData.firstName) personalChanges.firstName = formData.firstName;
        if (formData.lastName !== currentEmployee.personalData.lastName) personalChanges.lastName = formData.lastName;
        if (formData.phone !== currentEmployee.personalData.phone) personalChanges.phone = formData.phone;
        if (formData.email !== currentEmployee.personalData.email) personalChanges.email = formData.email;
        if (formData.street !== currentEmployee.personalData.street) personalChanges.street = formData.street;
        if (formData.city !== currentEmployee.personalData.city) personalChanges.city = formData.city;
        if (formData.zip !== currentEmployee.personalData.zip) personalChanges.zip = formData.zip;

        if (Object.keys(personalChanges).length > 0) {
            pendingChanges.personalData = personalChanges;
        }

        if (formData.iban !== currentEmployee.bankDetails.iban) {
            pendingChanges.bankDetails = { iban: formData.iban };
        }

        if (Object.keys(pendingChanges).length === 0) {
            setIsSaving(false);
            showToast?.("Keine Änderungen festgestellt.", "info");
            return;
        }

        const result = await requestEmployeeUpdate(currentEmployee.id, pendingChanges)

        setIsSaving(false)
        if (result?.success) {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
        }
    }

    const handlePreview = (doc: EmployeeDocument) => {
        setPreviewDoc(doc)
        setIsPreviewOpen(true)
    }

    const handleDownload = (doc: EmployeeDocument) => {
        if (!doc.content) return
        const link = document.createElement('a')
        link.href = doc.content
        link.download = doc.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const fieldGroups = [
        {
            id: "personal",
            title: "Persönliche Daten",
            icon: User,
            fields: [
                { label: "Vorname", key: "firstName", icon: User, readOnly: true },
                { label: "Nachname", key: "lastName", icon: User, readOnly: true },
                { label: "Telefon", key: "phone", icon: Phone },
                { label: "Email", key: "email", icon: Mail },
            ]
        },
        {
            id: "address",
            title: "Anschrift",
            icon: MapPin,
            fields: [
                { label: "Straße & Hausnummer", key: "street", icon: MapPin },
                { label: "Stadt", key: "city", icon: MapPin },
                { label: "PLZ", key: "zip", icon: MapPin },
            ]
        },
        {
            id: "bank",
            title: "Bankverbindung",
            icon: CreditCard,
            fields: [
                { label: "IBAN", key: "iban", icon: CreditCard, readOnly: true },
            ]
        }
    ]

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-36">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center gap-5 mt-4">
                <div className="h-28 w-28 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center border-4 border-white shadow-2xl shadow-indigo-500/10 relative group">
                    <div className="absolute inset-0 bg-indigo-600/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {currentEmployee.avatar ? (
                        <img src={currentEmployee.avatar} alt="Avatar" className="h-full w-full object-cover rounded-[2.5rem]" />
                    ) : (
                        <User className="h-12 w-12 text-indigo-500" />
                    )}
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-4 w-4 text-white" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {currentEmployee.personalData.firstName} {currentEmployee.personalData.lastName}
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{currentEmployee.employment.position || "Mitarbeiter"}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">#{currentEmployee.employeeNumber}</span>
                    </div>
                </div>
            </div>

            {/* Employer Card (NOW AT THE TOP) */}
            <div className="space-y-4">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] ml-1">Arbeitgeber</p>
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl -ml-12 -mb-12" />

                    <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                <Building2 className="h-6 w-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">{companyData?.companyName || "FlowY Construction"}</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{companyData?.vatId || "ATU 77338822"}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-4">
                                <MapPin className="h-4 w-4 text-white/30 shrink-0 mt-1" />
                                <div className="text-sm font-medium text-slate-300">
                                    <p>{companyData?.street || "Handelskai 94"}</p>
                                    <p>{companyData?.zipCode || "1200"} {companyData?.city || "Wien"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Mail className="h-4 w-4 text-white/30 shrink-0" />
                                <p className="text-sm font-medium text-slate-300">{companyData?.email || "office@flowy.app"}</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 w-full" />
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Zulassungsbehörde: Stadt Wien</span>
                            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Changes Warning */}
            {hasPendingChanges && (
                <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-5 flex items-start gap-4 shadow-sm">
                    <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-black text-amber-900 leading-none mb-1">Änderungsantrag ausstehend</p>
                        <p className="text-xs text-amber-700/70 font-medium leading-relaxed">Deine Anfragen werden aktuell von der Verwaltung geprüft.</p>
                    </div>
                </div>
            )}

            {/* Accordion Sections */}
            <div className="space-y-4">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] ml-1">Verwaltung</p>

                {fieldGroups.map((group) => {
                    const isExpanded = expandedSection === group.id
                    return (
                        <div key={group.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                            <button
                                onClick={() => toggleSection(group.id)}
                                className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        isExpanded ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                                    )}>
                                        <group.icon className="h-5 w-5" />
                                    </div>
                                    <span className="font-black text-slate-800 tracking-tight uppercase text-[12px]">{group.title}</span>
                                </div>
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                    isExpanded ? "bg-indigo-50 text-indigo-600 rotate-180" : "bg-slate-50 text-slate-300"
                                )}>
                                    <ChevronDown className="h-4 w-4 stroke-[3px]" />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-6 pb-6 space-y-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                                    <div className="h-px bg-slate-50 w-full mb-4" />
                                    {group.fields.map((field) => (
                                        <div key={field.key} className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{field.label}</label>
                                                {field.readOnly && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">Schreibgeschützt</span>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <div className={cn(
                                                    "absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                                                    field.readOnly ? "bg-slate-50 text-slate-200" : "bg-slate-50 text-slate-400 group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600"
                                                )}>
                                                    <field.icon className="h-4 w-4" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={(formData as any)[field.key]}
                                                    readOnly={field.readOnly}
                                                    onChange={(e) => {
                                                        if (field.readOnly) return;
                                                        setFormData(prev => ({ ...prev, [field.key]: e.target.value }));
                                                    }}
                                                    className={cn(
                                                        "w-full bg-slate-50/50 rounded-xl pl-14 pr-4 py-3 text-sm font-black outline-none border border-transparent transition-all",
                                                        field.readOnly ? "text-slate-400 cursor-not-allowed" : "text-slate-800 focus:bg-white focus:border-indigo-100 focus:shadow-sm"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Documents Accordion */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
                    <button
                        onClick={() => toggleSection('documents')}
                        className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                expandedSection === 'documents' ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-400"
                            )}>
                                <Folder className="h-5 w-5" />
                            </div>
                            <span className="font-black text-slate-800 tracking-tight uppercase text-[12px]">Meine Dokumente</span>
                        </div>
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                            expandedSection === 'documents' ? "bg-emerald-50 text-emerald-600 rotate-180" : "bg-slate-50 text-slate-300"
                        )}>
                            <ChevronDown className="h-4 w-4 stroke-[3px]" />
                        </div>
                    </button>

                    {expandedSection === 'documents' && (
                        <div className="px-6 pb-6 space-y-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                            <div className="h-px bg-slate-50 w-full mb-4" />
                            {Object.keys(groupedDocuments).length === 0 ? (
                                <div className="text-center py-10 space-y-3">
                                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                                        <Folder className="h-6 w-6" />
                                    </div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Keine Dokumente verfügbar</p>
                                </div>
                            ) : (
                                Object.entries(groupedDocuments).map(([folderName, folderDocs]) => (
                                    <div key={folderName} className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <Folder className="h-3 w-3 text-indigo-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{folderName}</span>
                                            <div className="flex-1 h-px bg-slate-100" />
                                        </div>
                                        <div className="space-y-3">
                                            {folderDocs.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-slate-800 truncate">{doc.name}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{doc.subType || "Dokument"}</p>
                                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{doc.fileSize}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => handlePreview(doc)}
                                                            className="h-9 w-9 bg-white text-slate-400 rounded-xl flex items-center justify-center shadow-sm hover:text-indigo-600 active:scale-90 transition-all"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(doc)}
                                                            className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            {isDirty && (
                <div className="fixed bottom-24 left-6 right-6 z-40 animate-in slide-in-from-bottom-10 duration-500">
                    {permissions?.personalData !== false ? (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "w-full py-5 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4",
                                showSuccess ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-900 text-white shadow-indigo-900/20 hover:bg-slate-800"
                            )}
                        >
                            {isSaving ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : showSuccess ? (
                                <>
                                    <CheckCircle2 className="h-6 w-6" />
                                    Antrag gesendet
                                </>
                            ) : (
                                <>
                                    <Save className="h-6 w-6" />
                                    Änderungen beantragen
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="bg-slate-100/80 backdrop-blur-md p-5 rounded-[2rem] border border-slate-200 text-center shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Änderungsfunktion deaktiviert
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={previewDoc}
            />

            {/* Logout Section */}
            <div className="pt-6 border-t border-slate-100 pb-10">
                <button
                    onClick={logoutEmployee}
                    className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] text-slate-800 hover:bg-rose-50 hover:text-rose-600 transition-all group overflow-hidden relative shadow-sm"
                >
                    <div className="absolute inset-0 bg-rose-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 group-hover:text-rose-500 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <LogOut className="h-6 w-6" />
                        </div>
                        <span className="font-black uppercase tracking-[0.15em] text-sm">Abmelden</span>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    )
}
