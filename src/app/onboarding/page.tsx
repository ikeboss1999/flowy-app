"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    ShieldCheck,
    User,
    Building2,
    ArrowRight,
    CheckCircle2,
    Lock,
    Calculator,
    LayoutDashboard,
    Trash2,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/context/SyncContext";

type Step = "pin" | "username" | "company" | "bank" | "logo" | "success";

export default function OnboardingPage() {
    const router = useRouter();
    const { user, signOut } = useAuth(); // Get user and signOut
    const { data: accountSettings, updateSettings: updateAccount, isLoading: isAccountLoading } = useAccountSettings();
    const { data: companySettings, updateData: updateCompany, isLoading: isCompanyLoading } = useCompanySettings();
    const { triggerSync } = useSync();

    const [currentStep, setCurrentStep] = useState<Step>("pin");
    const [isSaving, setIsSaving] = useState(false);
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [username, setUsername] = useState("");
    const [companyData, setCompanyData] = useState({
        companyName: "",
        street: "",
        zipCode: "",
        city: "",
        ceoFirstName: "",
        ceoLastName: "",
        bankName: "",
        iban: "",
        bic: "",
        vatId: "",
        logo: ""
    });

    // Initialize data from hooks once loaded
    useEffect(() => {
        if (!isAccountLoading && accountSettings) {
            if (accountSettings.onboardingCompleted) {
                console.log("Onboarding: Completed flag found, redirecting to /");
                router.push("/");
                return;
            }

            // Intelligence: Skip steps if data exists
            let nextStep: Step = "pin";

            if (accountSettings.pinCode) {
                setPin(accountSettings.pinCode);
                setConfirmPin(accountSettings.pinCode);
                nextStep = "username";
            }

            if (accountSettings.name && accountSettings.name !== 'Benutzer') {
                setUsername(accountSettings.name);
                if (nextStep === "username") nextStep = "company";
            }

            setCurrentStep(nextStep);
        }
    }, [isAccountLoading, accountSettings, router]);

    useEffect(() => {
        if (!isCompanyLoading && companySettings) {
            setCompanyData({
                companyName: companySettings.companyName || "",
                street: companySettings.street || "",
                zipCode: companySettings.zipCode || "",
                city: companySettings.city || "",
                ceoFirstName: companySettings.ceoFirstName || "",
                ceoLastName: companySettings.ceoLastName || "",
                bankName: companySettings.bankName || "",
                iban: companySettings.iban || "",
                bic: companySettings.bic || "",
                vatId: companySettings.vatId || "",
                logo: companySettings.logo || ""
            });
        }
    }, [isCompanyLoading, companySettings]);

    const handlePinSubmit = () => {
        if (pin.length < 4 || pin.length > 8) return;
        if (pin !== confirmPin) return;

        updateAccount({ pinCode: pin });
        setCurrentStep("username");
    };

    const handleUsernameSubmit = () => {
        if (username.trim().length === 0) return;

        updateAccount({ name: username });
        setCurrentStep("company");
    };

    const handleCompanySubmit = () => {
        if (!companyData.companyName || !companyData.city) return;
        setCurrentStep("bank");
    };

    const handleBankSubmit = () => {
        setCurrentStep("logo");
    };

    const handleLogoSubmit = (logoBase64?: string) => {
        if (logoBase64) {
            setCompanyData({ ...companyData, logo: logoBase64 });
        }
        setCurrentStep("success");
    };

    const handleFinalize = async () => {
        setIsSaving(true);
        try {
            await updateCompany(companyData);
            await updateAccount({ onboardingCompleted: true });

            // SYNC TO CLOUD: Update Supabase metadata
            if (user) {
                const { error } = await supabase.auth.updateUser({
                    data: { onboarding_completed: true }
                });
                if (error) console.error("Failed to sync onboarding status to cloud:", error);
                else console.log("Onboarding status synced to cloud.");

                // FINAL BLOCKING SYNC: Ensure all data is up there before proceeding
                await triggerSync({ blocking: true });
            }

            router.push("/");
        } catch (e) {
            console.error("Finalization failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    if (isAccountLoading || isCompanyLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Lade Profil...</p>
            </div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full relative z-10 space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto border border-white/10 shadow-2xl">
                        {currentStep === "pin" && <Lock className="w-8 h-8 text-indigo-400" />}
                        {currentStep === "username" && <User className="w-8 h-8 text-emerald-400" />}
                        {currentStep === "company" && <Building2 className="w-8 h-8 text-blue-400" />}
                        {currentStep === "bank" && <Calculator className="w-8 h-8 text-amber-400" />}
                        {currentStep === "logo" && <LayoutDashboard className="w-8 h-8 text-rose-400" />}
                        {currentStep === "success" && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            {currentStep === "pin" && "Sicherheit zuerst"}
                            {currentStep === "username" && "Wie dürfen wir Sie nennen?"}
                            {currentStep === "company" && "Ihr Unternehmen"}
                            {currentStep === "bank" && "Zahlungsinformationen"}
                            {currentStep === "logo" && "Ihr Firmenlogo"}
                            {currentStep === "success" && "Alles bereit!"}
                        </h1>
                        <p className="text-slate-400 font-medium">
                            {currentStep === "pin" && "Legen Sie einen 4-8 stelligen PIN-Code fest."}
                            {currentStep === "username" && "Dieser Name wird auf Ihrem Dashboard angezeigt."}
                            {currentStep === "company" && "Basisdaten für Ihre Rechnungen."}
                            {currentStep === "bank" && "Bankdaten und UID für rechtssichere Rechnungen."}
                            {currentStep === "logo" && "Laden Sie Ihr Logo für den Rechnungs-Briefkopf hoch."}
                            {currentStep === "success" && "Ihre Einrichtung ist abgeschlossen."}
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    {currentStep === "pin" && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">Neuer PIN-Code</label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="4-8 Ziffern"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all font-mono text-center tracking-[0.5em] text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">PIN bestätigen</label>
                                <input
                                    type="password"
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                    placeholder="PIN wiederholen"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all font-mono text-center tracking-[0.5em] text-lg"
                                />
                            </div>

                            <button
                                onClick={handlePinSubmit}
                                disabled={pin.length < 4 || pin !== confirmPin}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                            >
                                Weiter <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {currentStep === "username" && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">Ihr Name</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="z.B. Max Mustermann"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleUsernameSubmit}
                                disabled={username.trim().length === 0}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                            >
                                Weiter <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {currentStep === "company" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">Firmenname</label>
                                <input
                                    type="text"
                                    value={companyData.companyName}
                                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">Vorname (GF)</label>
                                    <input
                                        type="text"
                                        value={companyData.ceoFirstName}
                                        onChange={(e) => setCompanyData({ ...companyData, ceoFirstName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">Nachname (GF)</label>
                                    <input
                                        type="text"
                                        value={companyData.ceoLastName}
                                        onChange={(e) => setCompanyData({ ...companyData, ceoLastName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">Straße</label>
                                <input
                                    type="text"
                                    value={companyData.street}
                                    onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-[1fr,2fr] gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">PLZ</label>
                                    <input
                                        type="text"
                                        value={companyData.zipCode}
                                        onChange={(e) => setCompanyData({ ...companyData, zipCode: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">Ort</label>
                                    <input
                                        type="text"
                                        value={companyData.city}
                                        onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCompanySubmit}
                                disabled={!companyData.companyName || !companyData.city}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 mt-4"
                            >
                                Weiter <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {currentStep === "bank" && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">Bankname</label>
                                <input
                                    type="text"
                                    value={companyData.bankName}
                                    onChange={(e) => setCompanyData({ ...companyData, bankName: e.target.value })}
                                    placeholder="z.B. Erste Bank"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 ml-1">IBAN</label>
                                <input
                                    type="text"
                                    value={companyData.iban}
                                    onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value.toUpperCase() })}
                                    placeholder="AT00 0000 0000 0000 0000"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500 transition-all font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">BIC</label>
                                    <input
                                        type="text"
                                        value={companyData.bic}
                                        onChange={(e) => setCompanyData({ ...companyData, bic: e.target.value.toUpperCase() })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500 transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-300 ml-1">UID-Nummer</label>
                                    <input
                                        type="text"
                                        value={companyData.vatId}
                                        onChange={(e) => setCompanyData({ ...companyData, vatId: e.target.value.toUpperCase() })}
                                        placeholder="ATU00000000"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleBankSubmit}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 mt-4"
                            >
                                Weiter <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {currentStep === "logo" && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-8 hover:border-rose-500/50 transition-colors group relative overflow-hidden bg-black/20">
                                {companyData.logo ? (
                                    <div className="relative w-full aspect-video flex items-center justify-center">
                                        <img src={companyData.logo} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
                                        <button
                                            onClick={() => setCompanyData({ ...companyData, logo: "" })}
                                            className="absolute top-0 right-0 p-2 bg-rose-600 text-white rounded-full translate-x-1/2 -translate-y-1/2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-4 w-full">
                                        <div className="p-6 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                                            <Plus className="w-8 h-8 text-rose-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold">Bild auswählen</p>
                                            <p className="text-slate-400 text-sm">PNG, JPG bis 2MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        handleLogoSubmit(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setCurrentStep("success")}
                                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all"
                                >
                                    Überspringen
                                </button>
                                {companyData.logo && (
                                    <button
                                        onClick={() => setCurrentStep("success")}
                                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        Weiter <ArrowRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === "success" && (
                        <div className="text-center space-y-8 py-4">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
                                <div className="relative w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white">Großartig!</h3>
                                <p className="text-slate-400">
                                    Ihre Firmendaten wurden erfolgreich konfiguriert. Sie können jetzt Ihre erste Rechnung erstellen.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleFinalize}
                                    disabled={isSaving}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 group"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Zum Dashboard</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={async () => {
                                        await updateCompany(companyData);
                                        await updateAccount({ onboardingCompleted: true });

                                        // SYNC TO CLOUD
                                        if (user) {
                                            await supabase.auth.updateUser({
                                                data: { onboarding_completed: true }
                                            });
                                            // Final sync
                                            await triggerSync({ blocking: true });
                                        }

                                        router.push("/projects");
                                    }}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl transition-all border border-white/5"
                                >
                                    Erstes Projekt erstellen
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Steps Indicator */}
                <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">
                        <span>Fortschritt</span>
                        <span>
                            {currentStep === "pin" && "Schritt 1 von 6"}
                            {currentStep === "username" && "Schritt 2 von 6"}
                            {currentStep === "company" && "Schritt 3 von 6"}
                            {currentStep === "bank" && "Schritt 4 von 6"}
                            {currentStep === "logo" && "Schritt 5 von 6"}
                            {currentStep === "success" && "Schritt 6 von 6"}
                        </span>
                    </div>
                    <div className="flex gap-1.5 h-1.5">
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["pin", "username", "company", "bank", "logo", "success"].indexOf(currentStep) >= 0) ? "bg-indigo-500" : "bg-white/5")} />
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["username", "company", "bank", "logo", "success"].indexOf(currentStep) >= 1) ? "bg-emerald-500" : "bg-white/5")} />
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["company", "bank", "logo", "success"].indexOf(currentStep) >= 2) ? "bg-blue-500" : "bg-white/5")} />
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["bank", "logo", "success"].indexOf(currentStep) >= 3) ? "bg-amber-500" : "bg-white/5")} />
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["logo", "success"].indexOf(currentStep) >= 4) ? "bg-rose-500" : "bg-white/5")} />
                        <div className={cn("flex-1 rounded-full transition-all duration-500", (["success"].indexOf(currentStep) >= 5) ? "bg-emerald-500" : "bg-white/5")} />
                    </div>
                </div>
            </div>
            {/* Dev/Emergency Logout Button */}
            <button
                onClick={async () => {
                    // Force Wipe Local DB to fix "Loop" state
                    try {
                        const wipeUrl = user ? `/api/db/clear?userId=${user.id}` : '/api/db/clear';
                        await fetch(wipeUrl, { method: 'POST' });
                        console.log("Emergency Wipe executed.");
                    } catch (e) {
                        console.error("Wipe failed", e);
                    }
                    await signOut();
                    window.location.href = '/login';
                }}
                className="fixed top-4 right-4 z-[9999] px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-red-500/20 transition-all"
            >
                Not-Ausgang (Wipe & Logout)
            </button>
        </div>
    );
}
