"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    ArrowRight,
    Building2,
    Calculator,
    CheckCircle2,
    FileText,
    LayoutDashboard,
    Lock,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Upload,
    User,
    WalletCards,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";

type Step = "welcome" | "pin" | "username" | "company" | "bank" | "logo" | "success";

const steps: Step[] = ["welcome", "pin", "username", "company", "bank", "logo", "success"];

const stepMeta: Record<Step, { label: string; title: string; description: string }> = {
    welcome: {
        label: "Start",
        title: "FlowY einrichten",
        description: "Wir richten Sicherheit, Firmendaten und PDF-Informationen einmal sauber ein.",
    },
    pin: {
        label: "Sicherheit",
        title: "Sicherheit zuerst",
        description: "Mit diesem PIN entsperren Sie FlowY, wenn die App gesperrt ist.",
    },
    username: {
        label: "Benutzer",
        title: "Wie dürfen wir Sie nennen?",
        description: "Dieser Name wird auf der Startseite und in der App angezeigt.",
    },
    company: {
        label: "Firma",
        title: "Ihr Unternehmen",
        description: "Diese Daten erscheinen später automatisch auf Rechnungen und Angeboten.",
    },
    bank: {
        label: "Zahlung",
        title: "Zahlungsinformationen",
        description: "Bankdaten und UID werden für professionelle PDF-Dokumente vorbereitet.",
    },
    logo: {
        label: "Logo",
        title: "Ihr Firmenlogo",
        description: "Laden Sie Ihr Logo hoch und richten Sie es direkt für den Briefkopf aus.",
    },
    success: {
        label: "Fertig",
        title: "Alles bereit!",
        description: "FlowY ist eingerichtet. Sie können jetzt loslegen.",
    },
};

export default function OnboardingPage() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { data: accountSettings, updateSettings: updateAccount, isLoading: isAccountLoading } = useAccountSettings();
    const { data: companySettings, updateData: updateCompany, isLoading: isCompanyLoading } = useCompanySettings();

    const [currentStep, setCurrentStep] = useState<Step>("welcome");
    const [isInitialized, setIsInitialized] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [username, setUsername] = useState("");
    const [logoEditor, setLogoEditor] = useState<{
        src: string;
        originalSrc: string;
        zoom: number;
        offsetX: number;
        offsetY: number;
        rotation: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
        logo: "",
        originalLogo: "",
    });

    const currentStepIndex = steps.indexOf(currentStep);
    const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;
    const showDevWipe = process.env.NEXT_PUBLIC_SHOW_DEV_WIPE === "true";
    const activeMeta = stepMeta[currentStep];
    const inputClass = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-400 transition-all font-medium";
    const labelClass = "text-sm font-bold text-slate-300 ml-1";

    useEffect(() => {
        if (!isAccountLoading && accountSettings && !isInitialized) {
            if (accountSettings.onboardingCompleted) {
                router.push("/");
                return;
            }

            let nextStep: Step = "welcome";

            if (accountSettings.pinCode) {
                setPin(accountSettings.pinCode);
                setConfirmPin(accountSettings.pinCode);
                nextStep = "username";
            }

            if (accountSettings.name && accountSettings.name !== "Benutzer") {
                setUsername(accountSettings.name);
                if (nextStep === "username") nextStep = "company";
            }

            setCurrentStep(nextStep);
            setIsInitialized(true);
        }
    }, [isAccountLoading, accountSettings, router, isInitialized]);

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
                logo: companySettings.logo || "",
                originalLogo: companySettings.originalLogo || "",
            });
        }
    }, [isCompanyLoading, companySettings]);

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(steps[currentStepIndex - 1]);
        }
    };

    const handleCancelOnboarding = async () => {
        if (isCancelling) return;

        const confirmed = window.confirm(
            "Onboarding abbrechen? Ihr gerade angelegtes Konto und alle bereits gespeicherten Daten werden gelöscht."
        );
        if (!confirmed) return;

        setIsCancelling(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session?.access_token) {
                await fetch("/api/auth/sync-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ access_token: sessionData.session.access_token }),
                });
            }

            const response = await fetch("/api/auth/delete-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id }),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => null);
                throw new Error(error?.message || error?.error || "Konto konnte nicht gelöscht werden.");
            }

            sessionStorage.removeItem("flowy_app_unlocked_user");
            localStorage.removeItem("flowy_last_active_at");

            await supabase.auth.signOut();
            window.location.href = "/welcome";
        } catch (error) {
            console.error("Onboarding cancellation failed:", error);
            alert("Das Onboarding konnte nicht sauber abgebrochen werden. Bitte versuche es erneut.");
            setIsCancelling(false);
        }
    };

    const handlePinSubmit = () => {
        if (pin.length < 4 || pin.length > 8) return;
        if (pin !== confirmPin) return;
        updateAccount({ pinCode: pin });
        setCurrentStep("username");
    };

    const handleUsernameSubmit = () => {
        if (username.trim().length === 0) return;
        updateAccount({ name: username.trim() });
        setCurrentStep("company");
    };

    const handleCompanySubmit = () => {
        if (!canSubmitCompany) return;
        setCurrentStep("bank");
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setLogoEditor({
                src: result,
                originalSrc: result,
                zoom: 1,
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
            });
        };
        reader.readAsDataURL(file);
    };

    const openLogoEditor = () => {
        if (!companyData.logo) return;
        setLogoEditor({
            src: companyData.logo,
            originalSrc: companyData.originalLogo || companyData.logo,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
        });
    };

    const resetLogoEditor = () => {
        setLogoEditor((prev) => prev ? {
            ...prev,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            rotation: 0,
        } : prev);
    };

    const removeLogo = () => {
        setCompanyData({ ...companyData, logo: "", originalLogo: "" });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const saveEditedLogo = async () => {
        if (!logoEditor) return;

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = logoEditor.src;
        });

        const canvas = document.createElement("canvas");
        const outputWidth = 1300;
        const outputHeight = 360;
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, outputWidth, outputHeight);
        const baseScale = Math.min(outputWidth / image.width, outputHeight / image.height);
        const scale = baseScale * logoEditor.zoom;
        const offsetX = (logoEditor.offsetX / 100) * (outputWidth / 2);
        const offsetY = (logoEditor.offsetY / 100) * (outputHeight / 2);

        ctx.translate(outputWidth / 2 + offsetX, outputHeight / 2 + offsetY);
        ctx.rotate((logoEditor.rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        setCompanyData({
            ...companyData,
            logo: canvas.toDataURL("image/png"),
            originalLogo: logoEditor.originalSrc,
        });
        setLogoEditor(null);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFinalize = async (target: "/" | "/projects" = "/") => {
        setIsSaving(true);
        try {
            await updateCompany(companyData);
            await updateAccount({ onboardingCompleted: true });

            if (user) {
                const { error } = await supabase.auth.updateUser({
                    data: { onboarding_completed: true },
                });
                if (error) console.error("Failed to sync onboarding status to cloud:", error);
            }

            router.push(target);
        } catch (e) {
            console.error("Finalization failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const canSubmitCompany = Boolean(
        companyData.companyName.trim() &&
        companyData.street.trim() &&
        companyData.zipCode.trim() &&
        companyData.city.trim()
    );

    if (isAccountLoading || isCompanyLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Lade Profil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-hidden bg-[#070716] text-white relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(99,102,241,0.35),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(219,39,119,0.26),transparent_34%),linear-gradient(135deg,#050510_0%,#151047_52%,#29091f_100%)]" />
            <div className="absolute inset-0 bg-slate-950/35" />

            <main className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
                <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                <Sparkles className="h-6 w-6 text-cyan-200" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">FlowY Start</p>
                                <h2 className="text-2xl font-black">Einrichtung</h2>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            {steps.map((step, index) => {
                                const isActive = step === currentStep;
                                const isDone = index < currentStepIndex;
                                return (
                                    <button
                                        key={step}
                                        type="button"
                                        disabled={index > currentStepIndex}
                                        onClick={() => index <= currentStepIndex && setCurrentStep(step)}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                                            isActive && "border-indigo-300/60 bg-white/15 shadow-lg shadow-indigo-950/20",
                                            !isActive && isDone && "border-emerald-300/20 bg-emerald-400/10",
                                            !isActive && !isDone && "border-white/5 bg-white/[0.03] text-slate-400"
                                        )}
                                    >
                                        <span className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                                            isDone ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white"
                                        )}>
                                            {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-black">{stepMeta[step].label}</span>
                                            <span className="block text-xs font-semibold text-slate-400">{stepMeta[step].title}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                                <span>Fortschritt</span>
                                <span>{currentStepIndex + 1} / {steps.length}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </aside>

                    <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-7 lg:p-8">
                        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
                                    {currentStep === "welcome" && <ShieldCheck className="h-7 w-7 text-cyan-200" />}
                                    {currentStep === "pin" && <Lock className="h-7 w-7 text-indigo-200" />}
                                    {currentStep === "username" && <User className="h-7 w-7 text-emerald-200" />}
                                    {currentStep === "company" && <Building2 className="h-7 w-7 text-blue-200" />}
                                    {currentStep === "bank" && <Calculator className="h-7 w-7 text-amber-200" />}
                                    {currentStep === "logo" && <LayoutDashboard className="h-7 w-7 text-rose-200" />}
                                    {currentStep === "success" && <CheckCircle2 className="h-7 w-7 text-emerald-200" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">{activeMeta.label}</p>
                                    <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{activeMeta.title}</h1>
                                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{activeMeta.description}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelOnboarding}
                                disabled={isCancelling}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/15 hover:text-white disabled:cursor-wait disabled:opacity-70 lg:self-start"
                            >
                                {isCancelling ? (
                                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                    <X className="h-4 w-4" />
                                )}
                                {isCancelling ? "Wird gelöscht..." : "Abbrechen"}
                            </button>
                        </div>

                        <div className={cn(
                            "grid gap-6",
                            currentStep === "welcome" ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_320px]"
                        )}>
                            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 sm:p-6">
                                {currentStep === "welcome" && (
                                    <div className="space-y-6">
                                        <div className="grid gap-4 lg:grid-cols-3">
                                            {[
                                                { icon: Lock, title: "PIN-Schutz", text: "Schnell entsperren, wenn FlowY gesperrt ist." },
                                                { icon: FileText, title: "PDF-Daten", text: "Firmenkopf, Adresse und Bankdaten vorbereiten." },
                                                { icon: WalletCards, title: "Startklar", text: "Danach können Rechnungen und Projekte sauber starten." },
                                            ].map((item) => (
                                                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                                                    <item.icon className="mb-4 h-6 w-6 text-indigo-200" />
                                                    <h3 className="font-black">{item.title}</h3>
                                                    <p className="mt-2 text-sm font-semibold leading-5 text-slate-400">{item.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentStep("pin")}
                                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 py-4 font-black shadow-xl shadow-indigo-950/30 transition hover:scale-[1.01]"
                                        >
                                            Einrichtung starten <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}

                                {currentStep === "pin" && (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4 text-sm font-semibold text-indigo-100">
                                            Der PIN wird später für den Sperrbildschirm verwendet. Nutzen Sie 4 bis 8 Ziffern.
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className={labelClass}>Neuer PIN-Code</label>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    value={pin}
                                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                                    placeholder="PIN"
                                                    className={cn(inputClass, "text-center font-mono text-lg")}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>PIN bestätigen</label>
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    value={confirmPin}
                                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                                    placeholder="PIN"
                                                    className={cn(inputClass, "text-center font-mono text-lg")}
                                                />
                                            </div>
                                        </div>
                                        {pin && confirmPin && pin !== confirmPin && (
                                            <p className="text-sm font-bold text-rose-300">Die PIN-Codes stimmen noch nicht überein.</p>
                                        )}
                                        <StepActions
                                            onBack={handleBack}
                                            onNext={handlePinSubmit}
                                            disabled={pin.length < 4 || pin !== confirmPin}
                                        />
                                    </div>
                                )}

                                {currentStep === "username" && (
                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className={labelClass}>Ihr Name</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="z.B. Max Mustermann"
                                                className={inputClass}
                                            />
                                        </div>
                                        <StepActions
                                            onBack={handleBack}
                                            onNext={handleUsernameSubmit}
                                            disabled={username.trim().length === 0}
                                        />
                                    </div>
                                )}

                                {currentStep === "company" && (
                                    <div className="space-y-5">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Firmenname *</label>
                                                <input
                                                    type="text"
                                                    value={companyData.companyName}
                                                    onChange={(e) => setCompanyData({ ...companyData, companyName: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Vorname Geschäftsführer</label>
                                                <input
                                                    type="text"
                                                    value={companyData.ceoFirstName}
                                                    onChange={(e) => setCompanyData({ ...companyData, ceoFirstName: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Nachname Geschäftsführer</label>
                                                <input
                                                    type="text"
                                                    value={companyData.ceoLastName}
                                                    onChange={(e) => setCompanyData({ ...companyData, ceoLastName: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Straße *</label>
                                                <input
                                                    type="text"
                                                    value={companyData.street}
                                                    onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>PLZ *</label>
                                                <input
                                                    type="text"
                                                    value={companyData.zipCode}
                                                    onChange={(e) => setCompanyData({ ...companyData, zipCode: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>Ort *</label>
                                                <input
                                                    type="text"
                                                    value={companyData.city}
                                                    onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                        <StepActions onBack={handleBack} onNext={handleCompanySubmit} disabled={!canSubmitCompany} />
                                    </div>
                                )}

                                {currentStep === "bank" && (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm font-semibold text-amber-50">
                                            Empfohlen für Rechnungen: Diese Daten werden später im PDF-Fußbereich verwendet.
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>Bankname</label>
                                                <input
                                                    type="text"
                                                    value={companyData.bankName}
                                                    onChange={(e) => setCompanyData({ ...companyData, bankName: e.target.value })}
                                                    placeholder="z.B. Raiffeisen Bank"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <label className={labelClass}>IBAN</label>
                                                <input
                                                    type="text"
                                                    value={companyData.iban}
                                                    onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value.toUpperCase() })}
                                                    placeholder="AT00 0000 0000 0000 0000"
                                                    className={cn(inputClass, "font-mono")}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>BIC</label>
                                                <input
                                                    type="text"
                                                    value={companyData.bic}
                                                    onChange={(e) => setCompanyData({ ...companyData, bic: e.target.value.toUpperCase() })}
                                                    className={cn(inputClass, "font-mono")}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={labelClass}>UID-Nummer</label>
                                                <input
                                                    type="text"
                                                    value={companyData.vatId}
                                                    onChange={(e) => setCompanyData({ ...companyData, vatId: e.target.value.toUpperCase() })}
                                                    placeholder="ATU00000000"
                                                    className={cn(inputClass, "font-mono")}
                                                />
                                            </div>
                                        </div>
                                        <StepActions onBack={handleBack} onNext={() => setCurrentStep("logo")} />
                                    </div>
                                )}

                                {currentStep === "logo" && (
                                    <div className="space-y-5">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                        />

                                        <div className="rounded-3xl border border-dashed border-white/15 bg-black/20 p-5">
                                            {companyData.logo ? (
                                                <div className="space-y-4">
                                                    <div className="flex aspect-[13/4] items-center justify-center rounded-2xl bg-white p-4">
                                                        <img src={companyData.logo} alt="Firmenlogo" className="max-h-full max-w-full object-contain" />
                                                    </div>
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            onClick={openLogoEditor}
                                                            className="min-w-0 rounded-2xl bg-indigo-500 px-3 py-3 text-sm font-black text-white transition hover:bg-indigo-400"
                                                        >
                                                            Bearbeiten
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="min-w-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-sm font-black text-white transition hover:bg-white/15"
                                                        >
                                                            Ersetzen
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={removeLogo}
                                                            className="min-w-0 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-3 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/20 sm:col-span-2"
                                                        >
                                                            Entfernen
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center transition hover:border-rose-300/40 hover:bg-white/[0.07]"
                                                >
                                                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-400/15 text-rose-100">
                                                        <Upload className="h-7 w-7" />
                                                    </span>
                                                    <span>
                                                        <span className="block text-lg font-black">Logo hochladen</span>
                                                        <span className="mt-1 block text-sm font-semibold text-slate-400">PNG oder JPG, idealerweise mit transparentem Hintergrund.</span>
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentStep("success")}
                                                className="rounded-2xl border border-white/10 bg-white/10 py-4 font-black text-white transition hover:bg-white/15"
                                            >
                                                Überspringen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentStep("success")}
                                                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-4 font-black text-white shadow-lg shadow-rose-950/20 transition hover:scale-[1.01]"
                                            >
                                                Weiter <ArrowRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {currentStep === "success" && (
                                    <div className="space-y-7 text-center">
                                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10 shadow-2xl shadow-emerald-950/20">
                                            <CheckCircle2 className="h-12 w-12 text-emerald-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black">Großartig, FlowY ist startklar.</h3>
                                            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-400">
                                                Ihre wichtigsten Daten sind vorbereitet. Sie können direkt ins Dashboard oder mit dem ersten Projekt starten.
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                onClick={() => handleFinalize("/")}
                                                disabled={isSaving}
                                                className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-4 font-black text-white shadow-xl shadow-emerald-950/20 transition hover:bg-emerald-400 disabled:opacity-60"
                                            >
                                                {isSaving ? <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : "Zum Dashboard"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleFinalize("/projects")}
                                                disabled={isSaving}
                                                className="rounded-2xl border border-white/10 bg-white/10 py-4 font-black text-white transition hover:bg-white/15 disabled:opacity-60"
                                            >
                                                Erstes Projekt erstellen
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {currentStep !== "welcome" && (
                                <LivePreview companyData={companyData} username={username} pinReady={pin.length >= 4 && pin === confirmPin} />
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {logoEditor && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Logo bearbeiten</h3>
                                <p className="text-sm font-semibold text-slate-400">Zuschneiden, ausrichten und für PDF-Briefköpfe optimieren.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLogoEditor(null)}
                                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                                <div className="relative aspect-[13/4] overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-inner">
                                    <img
                                        src={logoEditor.src}
                                        alt="Logo Vorschau"
                                        className="absolute left-1/2 top-1/2 max-w-none select-none"
                                        style={{
                                            transform: `translate(calc(-50% + ${logoEditor.offsetX * 2}px), calc(-50% + ${logoEditor.offsetY}px)) rotate(${logoEditor.rotation}deg) scale(${logoEditor.zoom})`,
                                            maxHeight: "100%",
                                            maxWidth: "100%",
                                        }}
                                    />
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-indigo-500/20" />
                                </div>
                                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Dieser Rahmen entspricht ungefähr dem Logo-Bereich im Rechnungs- und Angebotskopf.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    { key: "zoom", label: "Zoom", min: 0.6, max: 3, step: 0.05, value: logoEditor.zoom },
                                    { key: "offsetX", label: "Horizontal", min: -100, max: 100, step: 1, value: logoEditor.offsetX },
                                    { key: "offsetY", label: "Vertikal", min: -100, max: 100, step: 1, value: logoEditor.offsetY },
                                    { key: "rotation", label: "Drehung", min: -15, max: 15, step: 0.5, value: logoEditor.rotation },
                                ].map((control) => (
                                    <div key={control.key}>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className="text-sm font-black text-slate-700">{control.label}</label>
                                            <span className="text-xs font-bold text-slate-400">
                                                {Number(control.value).toFixed(control.key === "zoom" ? 2 : 0)}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={control.min}
                                            max={control.max}
                                            step={control.step}
                                            value={control.value}
                                            onChange={(e) => {
                                                const value = Number(e.target.value);
                                                setLogoEditor((prev) => prev ? { ...prev, [control.key]: value } : prev);
                                            }}
                                            className="w-full accent-indigo-600"
                                        />
                                    </div>
                                ))}

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={resetLogoEditor}
                                        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEditedLogo}
                                        className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:scale-[1.02]"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Speichern
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDevWipe && (
                <button
                    onClick={async () => {
                        try {
                            const wipeUrl = user ? `/api/db/clear?userId=${user.id}` : "/api/db/clear";
                            await fetch(wipeUrl, { method: "POST" });
                        } catch (e) {
                            console.error("Wipe failed", e);
                        }
                        await signOut();
                        window.location.href = "/login";
                    }}
                    className="fixed right-4 top-4 z-[9999] rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-300 transition hover:bg-red-500/20"
                >
                    Dev: Wipe & Logout
                </button>
            )}
        </div>
    );
}

function StepActions({ onBack, onNext, disabled }: { onBack: () => void; onNext: () => void; disabled?: boolean }) {
    return (
        <div className="grid gap-3 pt-2 sm:grid-cols-[160px_minmax(0,1fr)]">
            <button
                type="button"
                onClick={onBack}
                className="rounded-2xl border border-white/10 bg-white/10 py-4 font-black text-white transition hover:bg-white/15"
            >
                Zurück
            </button>
            <button
                type="button"
                onClick={onNext}
                disabled={disabled}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 py-4 font-black text-white shadow-lg shadow-indigo-950/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
                Weiter <ArrowRight className="h-5 w-5" />
            </button>
        </div>
    );
}

function LivePreview({
    companyData,
    username,
    pinReady,
}: {
    companyData: {
        companyName: string;
        street: string;
        zipCode: string;
        city: string;
        ceoFirstName: string;
        ceoLastName: string;
        bankName: string;
        iban: string;
        bic: string;
        vatId: string;
        logo: string;
    };
    username: string;
    pinReady: boolean;
}) {
    const address = [companyData.street, [companyData.zipCode, companyData.city].filter(Boolean).join(" ")].filter(Boolean);
    const ceoName = [companyData.ceoFirstName, companyData.ceoLastName].filter(Boolean).join(" ");

    return (
        <aside className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <FileText className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                    <h3 className="font-black">Dokument-Vorschau</h3>
                    <p className="text-xs font-semibold text-slate-400">So wirken Ihre Stammdaten später.</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-black/20">
                <div className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    {companyData.logo ? (
                        <img src={companyData.logo} alt="Firmenlogo" className="max-h-14 max-w-36 object-contain" />
                    ) : (
                        <div className="flex h-14 w-36 items-center justify-center rounded-xl bg-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
                            Logo
                        </div>
                    )}
                    <div className="text-right text-[11px] font-semibold leading-5 text-slate-500">
                        <p>{address[0] || "Firmenstraße 1"}</p>
                        <p>{address[1] || "8010 Graz"}</p>
                    </div>
                </div>

                <div className="mt-5 space-y-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Firma</p>
                        <h4 className="mt-1 text-xl font-black">{companyData.companyName || "Ihre Firma"}</h4>
                    </div>
                    <div className="grid gap-3 text-xs font-bold text-slate-600">
                        <PreviewRow label="Benutzer" value={username || "Noch nicht gesetzt"} />
                        <PreviewRow label="PIN-Schutz" value={pinReady ? "Aktiv" : "Noch offen"} />
                        <PreviewRow label="Geschäftsführer" value={ceoName || "Optional"} />
                        <PreviewRow label="Bank" value={companyData.bankName || "Optional"} />
                        <PreviewRow label="IBAN" value={companyData.iban || "Optional"} />
                        <PreviewRow label="UID" value={companyData.vatId || "Optional"} />
                    </div>
                </div>
            </div>
        </aside>
    );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-slate-400">{label}</span>
            <span className="truncate text-right text-slate-800">{value}</span>
        </div>
    );
}
