"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, Delete, ShieldCheck } from "lucide-react";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const UNLOCK_KEY = "flowy_app_unlocked_user";
const LAST_ACTIVE_KEY = "flowy_last_active_at";
const LOCK_EVENT = "flowy-lock-app";
const INACTIVITY_LIMIT_MS = 1000 * 60 * 30;

export function AppLock() {
    const { user, currentEmployee, signOut } = useAuth();
    const { data: accountSettings, isLoading } = useAccountSettings();
    const { data: companySettings } = useCompanySettings();
    const [isLocked, setIsLocked] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);

    const targetPin = accountSettings?.pinCode || "";
    const isOwnerSession = !!user && !currentEmployee;
    const shouldUseLock = isOwnerSession && !!targetPin;
    const isCheckingLock = isOwnerSession && isLoading;
    const shouldShowLock = shouldUseLock && isLocked;
    const pinLength = Math.max(targetPin.length || 4, 4);
    const companyName = companySettings?.companyName || "FlowY";
    const userName = accountSettings?.name || user?.email || "Benutzer";
    const companyLogo = companySettings?.logo;
    const companyInitials = companyName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "FY";

    const dots = useMemo(() => Array.from({ length: pinLength }), [pinLength]);

    const addDigit = (digit: string) => {
        if (pin.length >= targetPin.length) return;
        setPin((current) => `${current}${digit}`);
    };

    const removeDigit = () => {
        setPin((current) => current.slice(0, -1));
    };

    useEffect(() => {
        if (isLoading || !user?.id) return;

        if (!shouldUseLock) {
            setIsLocked(false);
            return;
        }

        const unlockedUser = sessionStorage.getItem(UNLOCK_KEY);
        const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || "0");
        const wasInactive = lastActive > 0 && Date.now() - lastActive > INACTIVITY_LIMIT_MS;

        setIsLocked(unlockedUser !== user.id || wasInactive);
    }, [shouldUseLock, isLoading, user?.id]);

    useEffect(() => {
        const lockApp = () => {
            if (!shouldUseLock || !user?.id) return;
            sessionStorage.removeItem(UNLOCK_KEY);
            localStorage.setItem(LAST_ACTIVE_KEY, "0");
            setPin("");
            setError(false);
            setIsLocked(true);
        };

        window.addEventListener(LOCK_EVENT, lockApp);
        return () => window.removeEventListener(LOCK_EVENT, lockApp);
    }, [shouldUseLock, user?.id]);

    useEffect(() => {
        if (!shouldUseLock || isLocked) return;

        const markActive = () => {
            localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
        };

        markActive();
        window.addEventListener("mousemove", markActive);
        window.addEventListener("keydown", markActive);
        window.addEventListener("click", markActive);
        window.addEventListener("touchstart", markActive);

        const visibilityHandler = () => {
            if (document.visibilityState === "hidden") markActive();
        };
        window.addEventListener("visibilitychange", visibilityHandler);

        return () => {
            window.removeEventListener("mousemove", markActive);
            window.removeEventListener("keydown", markActive);
            window.removeEventListener("click", markActive);
            window.removeEventListener("touchstart", markActive);
            window.removeEventListener("visibilitychange", visibilityHandler);
        };
    }, [shouldUseLock, isLocked]);

    useEffect(() => {
        if (!targetPin || pin.length !== targetPin.length) return;

        if (pin === targetPin) {
            if (user?.id) sessionStorage.setItem(UNLOCK_KEY, user.id);
            localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
            setError(false);
            setPin("");
            setIsLocked(false);
            return;
        }

        setError(true);
        const timer = window.setTimeout(() => {
            setPin("");
            setError(false);
        }, 450);

        return () => window.clearTimeout(timer);
    }, [pin, targetPin, user?.id]);

    useEffect(() => {
        if (!isLocked && !isCheckingLock) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isLocked, isCheckingLock]);

    useEffect(() => {
        if (!isLocked) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (/^\d$/.test(event.key)) {
                event.preventDefault();
                addDigit(event.key);
                return;
            }

            if (event.key === "Backspace" || event.key === "Delete") {
                event.preventDefault();
                removeDigit();
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                setPin("");
                setError(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLocked, pin.length, targetPin.length]);

    if (!isCheckingLock && !shouldShowLock) return null;

    return (
        <div className="fixed inset-0 z-[500] flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] p-6 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_88%_82%,rgba(236,72,153,0.22),transparent_34%),radial-gradient(circle_at_12%_72%,rgba(168,85,247,0.18),transparent_34%)]" />
            <div className="absolute left-1/2 top-[-18%] h-[620px] w-[920px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
            <div className="absolute bottom-[-22%] right-[-12%] h-[480px] w-[620px] rounded-full bg-fuchsia-600/16 blur-[120px]" />
            <div className="absolute bottom-[-24%] left-[-12%] h-[420px] w-[540px] rounded-full bg-violet-600/12 blur-[120px]" />

            <div className={cn(
                "relative z-10 w-full max-w-[34rem] overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.07] px-6 pb-7 pt-8 text-center shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl ring-1 ring-white/10 sm:px-8",
                error && "animate-shake"
            )}>
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/15 blur-3xl" />
                <div className="pointer-events-none absolute -left-24 bottom-8 h-56 w-56 rounded-full bg-indigo-400/15 blur-3xl" />
                <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-[2.25rem] border border-white/20 bg-white p-5 text-4xl font-black text-indigo-700 shadow-2xl shadow-indigo-950/35 sm:h-36 sm:w-36">
                    <div className="absolute inset-0 rounded-[2.25rem] ring-1 ring-black/5" />
                    {companyLogo ? (
                        <img src={companyLogo} alt={`${companyName} Logo`} className="relative h-full w-full object-contain" />
                    ) : (
                        <span className="relative">{companyInitials}</span>
                    )}
                </div>

                <div className="relative mt-7 space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-200/85">{companyName}</p>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                        {isCheckingLock ? "Sitzung wird geschützt" : "Willkommen zurück"}
                    </h1>
                    <div className="mx-auto mt-3 inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white/85 shadow-inner">
                        <span className="truncate">{userName}</span>
                    </div>
                    <p className="mx-auto max-w-sm pt-1 text-sm font-semibold leading-relaxed text-white/50">
                        {isCheckingLock
                            ? "FlowY bereitet den sicheren Zugriff vor."
                            : "Geben Sie Ihren PIN ein, um FlowY sicher zu entsperren."}
                    </p>
                </div>

                {isCheckingLock ? (
                    <div className="mx-auto mt-8 h-12 w-12 rounded-full border-4 border-white/15 border-t-white/80 animate-spin" />
                ) : (
                    <div className="relative mx-auto mt-7 flex w-fit justify-center gap-3 rounded-full border border-white/10 bg-black/15 px-5 py-3 shadow-inner">
                        {dots.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-3.5 w-3.5 rounded-full border border-white/20 transition-all duration-200",
                                    index < pin.length ? "scale-125 border-white bg-white shadow-lg shadow-white/20" : "bg-white/10",
                                    error && "border-rose-300 bg-rose-400 shadow-rose-400/20"
                                )}
                            />
                        ))}
                    </div>
                )}

                {error && (
                    <p className="mt-4 text-sm font-bold text-rose-300">PIN ist nicht korrekt.</p>
                )}

                {!isCheckingLock && (
                <div className="relative mx-auto mt-7 grid max-w-[22rem] grid-cols-3 gap-3 rounded-[2rem] border border-white/10 bg-black/10 p-3 shadow-inner">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                        <button
                            key={digit}
                            type="button"
                            onClick={() => addDigit(digit)}
                            className="flex h-16 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.08] text-2xl font-black shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-0 active:scale-95"
                        >
                            {digit}
                        </button>
                    ))}
                    <div />
                    <button
                        type="button"
                        onClick={() => addDigit("0")}
                        className="flex h-16 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.08] text-2xl font-black shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-0 active:scale-95"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={removeDigit}
                        className="flex h-16 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.08] text-white/80 shadow-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/16 hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-0 active:scale-95"
                    >
                        <Delete className="h-6 w-6" />
                    </button>
                </div>
                )}

                {!isCheckingLock && (
                <div className="relative mt-7 flex flex-col gap-3">
                    <div className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-200/80">
                        <ShieldCheck className="h-4 w-4" />
                        Bestehende Sitzung bleibt geschützt
                    </div>
                    <button
                        type="button"
                        onClick={() => signOut()}
                        className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white/50 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                        <LogOut className="h-4 w-4" />
                        Mit anderem Konto anmelden
                    </button>
                </div>
                )}
            </div>
        </div>
    );
}
