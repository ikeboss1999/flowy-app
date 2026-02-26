"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/context/AuthContext"
import { useEmployees } from "@/hooks/useEmployees"
import { cn } from "@/lib/utils"
import {
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    ChevronRight,
    Camera,
    Save,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { SelfieCaptureModal } from "@/components/mobile/SelfieCaptureModal"
import { useNotification } from "@/context/NotificationContext"

export default function MobileProfilePage() {
    const { currentEmployee, refreshEmployee } = useAuth()
    const { requestEmployeeUpdate, updateEmployee, isLoading: employeesLoading } = useEmployees()
    const { showToast } = useNotification()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showSelfieModal, setShowSelfieModal] = useState(false)

    const [formData, setFormData] = useState({
        personalData: {
            firstName: "",
            lastName: "",
            phone: "",
            email: "",
            street: "",
            city: "",
            zip: "",
        },
        bankDetails: {
            iban: ""
        }
    })

    // Grouping settings for rendering
    const settingGroups = useMemo(() => {
        if (!currentEmployee) return [];

        const groups = [
            {
                title: "Persönliche Daten",
                items: [
                    { id: 'firstName', label: "Vorname", value: currentEmployee.personalData.firstName, icon: User, readonly: true },
                    { id: 'lastName', label: "Nachname", value: currentEmployee.personalData.lastName, icon: User, readonly: true },
                    { id: 'phone', label: "Telefon", value: formData.personalData.phone, icon: Phone, type: 'tel', category: 'personalData' },
                    { id: 'email', label: "E-Mail", value: formData.personalData.email, icon: Mail, type: 'email', category: 'personalData' },
                ]
            },
            {
                title: "Anschrift",
                items: [
                    { id: 'street', label: "Straße & Hausnummer", value: formData.personalData.street, icon: MapPin, category: 'personalData' },
                    { id: 'city', label: "Stadt", value: formData.personalData.city, icon: MapPin, category: 'personalData' },
                    { id: 'zip', label: "PLZ", value: formData.personalData.zip, icon: MapPin, category: 'personalData' },
                ]
            },
            {
                title: "Bankverbindung",
                items: [
                    { id: 'iban', label: "IBAN", value: formData.bankDetails.iban, icon: CreditCard, category: 'bankDetails' },
                ]
            }
        ];
        return groups;
    }, [currentEmployee, formData]);

    // Populate form data when currentEmployee loads
    useEffect(() => {
        if (currentEmployee) {
            setFormData({
                personalData: {
                    firstName: currentEmployee.personalData.firstName || "",
                    lastName: currentEmployee.personalData.lastName || "",
                    phone: currentEmployee.personalData.phone || "",
                    email: currentEmployee.personalData.email || "",
                    street: currentEmployee.personalData.street || "",
                    city: currentEmployee.personalData.city || "",
                    zip: currentEmployee.personalData.zip || "",
                },
                bankDetails: {
                    iban: currentEmployee.bankDetails.iban || ""
                }
            })
            setIsLoading(false);
        }
    }, [currentEmployee])

    // Check if form is dirty
    const isDirty = useMemo(() => {
        if (!currentEmployee || !formData.personalData.firstName) return false;

        const checkValue = (val: any) => val === undefined || val === null ? "" : String(val).trim();

        // Check Personal Data
        const pKeys = ['phone', 'email', 'street', 'city', 'zip'] as const;
        for (const key of pKeys) {
            if (checkValue(formData.personalData[key]) !== checkValue(currentEmployee.personalData[key as keyof typeof currentEmployee.personalData])) return true;
        }

        // Check Bank Details
        if (checkValue(formData.bankDetails.iban) !== checkValue(currentEmployee.bankDetails.iban)) return true;

        return false;
    }, [formData, currentEmployee]);

    if (!currentEmployee) return null

    const handleInputChange = (category: string, id: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [category]: {
                ...(prev as any)[category],
                [id]: value
            }
        }))
    }

    const handleSave = async () => {
        if (!isDirty || isSaving) return;

        setIsSaving(true);
        try {
            // Prepare pending changes object
            const pendingChanges = {
                personalData: {
                    phone: formData.personalData.phone,
                    email: formData.personalData.email,
                    street: formData.personalData.street,
                    city: formData.personalData.city,
                    zip: formData.personalData.zip,
                },
                bankDetails: {
                    iban: formData.bankDetails.iban
                }
            };

            const result = await requestEmployeeUpdate(currentEmployee.id, pendingChanges);
            if (result?.success) {
                showToast("Änderungen wurden zur Prüfung eingereicht.", "success");
            } else {
                showToast("Fehler beim Übermitteln der Änderungen.", "error");
            }
        } catch (error) {
            showToast("Verbindungsfehler.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSelfie = async (base64: string) => {
        if (!currentEmployee) return;

        setIsSaving(true);
        try {
            const updatedEmployee = {
                ...currentEmployee,
                avatar: base64,
                appAccess: currentEmployee.appAccess, // Explicit preservation from previous fix
                updatedAt: new Date().toISOString()
            };

            await updateEmployee(currentEmployee.id, updatedEmployee);
            await refreshEmployee();
            showToast("Profilbild erfolgreich aktualisiert.", "success");
        } catch (error) {
            showToast("Fehler beim Speichern des Profilbilds.", "error");
        } finally {
            setIsSaving(false);
            setShowSelfieModal(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile Hero */}
            <div className="px-8 pt-8 pb-10 bg-white border-b border-slate-100 flex flex-col items-center text-center gap-6">
                <div className="relative group">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center shadow-2xl shadow-indigo-200 ring-4 ring-white group-active:scale-95 transition-all overflow-hidden">
                        {currentEmployee.avatar ? (
                            <img src={currentEmployee.avatar} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-12 w-12 text-indigo-600" />
                        )}
                    </div>
                    <button
                        onClick={() => setShowSelfieModal(true)}
                        className="absolute -bottom-2 -right-2 h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-300 ring-4 ring-white active:scale-90 transition-all"
                    >
                        <Camera className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        {currentEmployee.personalData.firstName} {currentEmployee.personalData.lastName}
                    </h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.15em]">
                        {currentEmployee.employment.position} • #{currentEmployee.appAccess?.staffId || currentEmployee.employeeNumber}
                    </p>
                </div>
            </div>

            {/* Form Sections */}
            <div className="p-8 space-y-10 pb-32">
                {settingGroups.map((group) => (
                    <div key={group.title} className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">
                            {group.title}
                        </p>
                        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm divide-y divide-slate-50 overflow-hidden">
                            {group.items.map((item) => (
                                <div key={item.id} className="p-5 flex flex-col gap-1.5 group">
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-3.5 w-3.5 text-slate-300" />
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {item.label}
                                        </label>
                                    </div>
                                    <input
                                        type={item.type || 'text'}
                                        value={item.value}
                                        onChange={(e) => !item.readonly && handleInputChange(item.category!, item.id, e.target.value)}
                                        readOnly={item.readonly}
                                        className={cn(
                                            "w-full text-base font-black text-slate-800 bg-transparent outline-none p-1 -ml-1 rounded-lg transition-all",
                                            item.readonly ? "text-slate-400" : "focus:bg-indigo-50 focus:px-3 focus:text-indigo-600"
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Info Box */}
                <div className="bg-amber-50 rounded-[2.5rem] p-7 border border-amber-100 flex gap-4 animate-pulse">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm text-amber-500">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-amber-900 font-black text-sm mb-1">Änderungswünsche</p>
                        <p className="text-amber-700/70 text-[11px] leading-relaxed font-medium">
                            Ihre Datenänderungen müssen von der Verwaltung geprüft werden, bevor sie übernommen werden.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sticky Save Bar */}
            <div className={cn(
                "fixed bottom-24 left-0 right-0 p-8 pt-0 z-40 transition-all duration-500 translate-y-0",
                isDirty ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-y-10"
            )}>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black tracking-[0.15em] uppercase text-sm shadow-2xl shadow-indigo-300 flex items-center justify-center gap-3 overflow-hidden group active:scale-95 transition-all"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Wird gesendet...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span>Änderungen beantragen</span>
                        </>
                    )}
                </button>
            </div>

            <SelfieCaptureModal
                isOpen={showSelfieModal}
                onClose={() => setShowSelfieModal(false)}
                onSave={handleSaveSelfie}
            />
        </div>
    )
}
