"use client";

import React, { useState } from 'react';
import {
    User,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNotification } from "@/context/NotificationContext";

interface AccordionSectionProps {
    title: string;
    icon: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function AccordionSection({ title, icon: Icon, isOpen, onToggle, children }: AccordionSectionProps) {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-4 shadow-sm transition-all duration-300">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-6 w-6 text-slate-400" />
                ) : (
                    <ChevronDown className="h-6 w-6 text-slate-400" />
                )}
            </button>
            <div className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-8 border-t border-slate-100">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function AccountSettings() {
    const [openSection, setOpenSection] = useState<string | null>("benutzerkonto");
    const { user } = useAuth();
    const { showToast } = useNotification();
    const { data: settings, updateSettings, isLoading } = useAccountSettings();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    // PIN State
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");

    // Feedback States
    const [showNameSuccess, setShowNameSuccess] = useState(false);
    const [showEmailSuccess, setShowEmailSuccess] = useState(false);
    const [showPinSuccess, setShowPinSuccess] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
    const [deletePinInput, setDeletePinInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    // Update local state when settings load
    React.useEffect(() => {
        if (!isLoading) {
            setName(settings.name);
            if (user?.email) {
                setEmail(user.email);
            }
        }
    }, [settings, isLoading, user]);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handlePinChange = () => {
        if (newPin.length >= 4 && newPin.length <= 8 && newPin === confirmPin) {
            updateSettings({ pinCode: newPin });
            setShowPinSuccess(true);
            setTimeout(() => setShowPinSuccess(false), 3000);
            setNewPin("");
            setConfirmPin("");
        }
    };

    const handleSave = () => {
        updateSettings({ name });
        setShowNameSuccess(true);
        setTimeout(() => setShowNameSuccess(false), 3000);
    };

    const handleEmailSave = async () => {
        try {
            const { error } = await supabase.auth.updateUser({ email });
            if (error) throw error;
            setShowEmailSuccess(true);
            setTimeout(() => setShowEmailSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to update email', error);
            showToast("Fehler beim Aktualisieren der E-Mail-Adresse.", "error");
        }
    };

    const performDeletion = async () => {
        setIsDeleting(true);
        try {
            if (!user?.id) throw new Error("Benutzer-ID nicht gefunden.");

            // 1. Call the API to delete data and account
            const response = await fetch('/api/auth/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Löschvorgang auf dem Server fehlgeschlagen.');
            }

            // 2. Targeted Cleanup of LocalStorage
            const sharedKeys = [
                'flowy_services',
                'flowy_todos',
                'flowy_employees',
                'flowy_time_entries',
                'flowy_timesheets',
                'flowy_vehicles'
            ];

            sharedKeys.forEach(key => {
                const savedData = localStorage.getItem(key);
                if (savedData) {
                    try {
                        const items = JSON.parse(savedData);
                        if (Array.isArray(items)) {
                            // Filter out current user's items
                            const remainingItems = items.filter((item: any) => item.userId !== user?.id);
                            localStorage.setItem(key, JSON.stringify(remainingItems));
                        }
                    } catch (e) {
                        console.error(`Failed to clean up ${key}`, e);
                    }
                }
            });

            // 3. Specifically remove user-suffixed keys
            const specificKeys = [
                'account_settings',
                'flowy_company_data',
                'flowy_invoice_settings',
                `account_settings_${user.id}`,
                `account_settings_${settings.name}`,
                'current_user_id'
            ].filter(Boolean);
            specificKeys.forEach(key => localStorage.removeItem(key));

            // 4. Final catch-all for any other user-specific items that might start with their ID
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes(user.id) || key.startsWith(`flowy_user_${user.id}`))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // 5. Full Sign Out
            await supabase.auth.signOut();

            showToast("Ihr Konto und alle Daten wurden erfolgreich gelöscht.", "success");
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } catch (error: any) {
            console.error('Deletion failed', error);
            showToast(`Fehler: ${error.message || 'Unbekannter Fehler'}.`, "error");
            setIsDeleting(false);
        }
    };

    const handleDeleteData = () => {
        setIsDeleteModalOpen(true);
    };

    const inputClasses = "w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium";
    const labelClasses = "block text-sm font-bold text-slate-700 mb-2 ml-1";

    if (isLoading) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-10 p-4 rounded-3xl bg-slate-50/50 border border-slate-100/50">
                <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-200">
                    <User className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mein Konto</h2>
            </div>

            {/* Benutzerkonto */}
            <AccordionSection
                title="Benutzerkonto"
                icon={User}
                isOpen={openSection === "benutzerkonto"}
                onToggle={() => toggleSection("benutzerkonto")}
            >
                <div className="space-y-8">
                    <div>
                        <label className={labelClasses}>Ihr Name</label>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputClasses}
                            />
                            <button
                                onClick={handleSave}
                                className={cn(
                                    "px-8 py-4 border rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap",
                                    showNameSuccess
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <CheckCircle2 className={cn("h-5 w-5", showNameSuccess ? "text-emerald-500 animate-in zoom-in duration-300" : "text-emerald-500")} />
                                {showNameSuccess ? "Gespeichert!" : "Speichern"}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className={labelClasses}>Ihre E-Mail-Adresse</label>
                        <div className="flex gap-4">
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@firma.com"
                                className={inputClasses}
                            />
                            <button
                                onClick={handleEmailSave}
                                className={cn(
                                    "px-8 py-4 border rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap",
                                    showEmailSuccess
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                <CheckCircle2 className={cn("h-5 w-5", showEmailSuccess ? "text-emerald-500 animate-in zoom-in duration-300" : "text-emerald-500")} />
                                {showEmailSuccess ? "Gespeichert!" : "Speichern"}
                            </button>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Sicherheit (PIN) */}
            <AccordionSection
                title="Sicherheit (PIN)"
                icon={Lock}
                isOpen={openSection === "security"}
                onToggle={() => toggleSection("security")}
            >
                <div className="space-y-8">
                    <p className="text-slate-500 text-sm">
                        Hier können Sie Ihren 4-8 stelligen PIN-Code ändern, der für den Zugriff auf sensible Bereiche benötigt wird.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>Neuer PIN-Code</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                placeholder="4-8 Ziffern"
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>PIN Bestätigen</label>
                            <div className="flex gap-4">
                                <input
                                    type="password"
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="PIN wiederholen"
                                    className={inputClasses}
                                />
                                <button
                                    onClick={handlePinChange}
                                    disabled={!newPin || newPin.length < 4 || newPin !== confirmPin}
                                    className={cn(
                                        "px-6 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed whitespace-nowrap",
                                        showPinSuccess
                                            ? "bg-emerald-500 text-white shadow-emerald-200"
                                            : "bg-indigo-600 disabled:bg-indigo-300 text-white shadow-indigo-200 hover:bg-indigo-700"
                                    )}
                                >
                                    <CheckCircle2 className={cn("h-5 w-5", showPinSuccess && "animate-in zoom-in duration-300")} />
                                    {showPinSuccess ? "PIN geändert!" : "PIN Ändern"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Daten löschen */}
            <AccordionSection
                title="Datenzone"
                icon={Trash2}
                isOpen={openSection === "delete"}
                onToggle={() => toggleSection("delete")}
            >
                <div className="space-y-6">
                    <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-1" />
                        <div>
                            <h4 className="text-lg font-bold text-red-900 mb-2">Gesamtes Konto löschen</h4>
                            <p className="text-red-700 leading-relaxed mb-6">
                                Achtung: Diese Aktion löscht alle Ihre gespeicherten Daten (Rechnungen, Kunden, Einstellungen) unwiderruflich von diesem Gerät.
                                <br />Dieser Vorgang kann nicht rückgängig gemacht werden.
                            </p>
                            <button
                                onClick={handleDeleteData}
                                className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
                            >
                                <Trash2 className="h-5 w-5" />
                                Alle Daten löschen
                            </button>
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-4">
                            <div className="h-20 w-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-600" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Konto löschen?</h3>
                            <p className="text-slate-500 font-medium">
                                Dieser Vorgang ist endgültig. Bitte bestätigen Sie Ihre Identität.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Bitte tippen Sie 'LÖSCHEN'</label>
                                <input
                                    type="text"
                                    value={deleteConfirmationText}
                                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                    placeholder="LÖSCHEN"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-black text-center text-red-600 tracking-widest"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">PIN-Code eingeben</label>
                                <input
                                    type="password"
                                    value={deletePinInput}
                                    onChange={(e) => setDeletePinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="••••"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono text-center text-2xl tracking-[0.5em]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={performDeletion}
                                disabled={deleteConfirmationText !== "LÖSCHEN" || deletePinInput !== (settings.pinCode || "0000") || isDeleting}
                                className="w-full py-5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? "Wird gelöscht..." : "KONTODATEN UNWIDERRUFLICH LÖSCHEN"}
                            </button>
                            <button
                                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="w-full py-4 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                            >
                                Abbrechen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
