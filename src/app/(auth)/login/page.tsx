"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getAuthErrorMessage } from "@/lib/auth-utils"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock, Mail, User, Eye, EyeOff, Delete, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useDevice } from "@/hooks/useDevice"
import { cn } from "@/lib/utils"

export default function LoginPage() {
    const searchParams = useSearchParams()
    const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register')
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [quickPin, setQuickPin] = useState("")
    const [quickPinError, setQuickPinError] = useState(false)
    const [quickUnlock, setQuickUnlock] = useState<{
        userId: string;
        email: string;
        name: string;
        pinCode: string;
        accessToken: string;
    } | null>(null)
    const { isMobile, isDesktop, isIPhone } = useDevice()
    const [isLocalhost, setIsLocalhost] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setIsMounted(true)
        setIsLocalhost(window.location.hostname === 'localhost')
    }, [])

    useEffect(() => {
        if (!isMounted || !isLogin) return;

        let cancelled = false;

        const loadQuickUnlock = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token || !session.user?.id) return;

                const syncResponse = await fetch('/api/auth/sync-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token: session.access_token })
                });
                if (!syncResponse.ok) return;

                const settingsResponse = await fetch(`/api/settings?userId=${encodeURIComponent(session.user.id)}`);
                if (!settingsResponse.ok) return;

                const settings = await settingsResponse.json();
                const pinCode = settings?.accountSettings?.pinCode;
                if (!pinCode || cancelled) return;

                setQuickUnlock({
                    userId: session.user.id,
                    email: session.user.email || "",
                    name: settings?.accountSettings?.name || session.user.email || "Benutzer",
                    pinCode,
                    accessToken: session.access_token
                });
            } catch (error) {
                console.warn("[QuickUnlock]", error);
            }
        };

        loadQuickUnlock();

        return () => {
            cancelled = true;
        };
    }, [isMounted, isLogin])

    // Sync state with query param if it changes
    useEffect(() => {
        if (!isMounted) return;
        const mode = searchParams.get('mode')
        if (mode === 'register') setIsLogin(false)
        else setIsLogin(true)
    }, [searchParams, isMounted])



    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        if (!isLogin && password !== confirmPassword) {
            setError("Die Passwörter stimmen nicht überein.")
            setLoading(false)
            return
        }

        try {
            if (isLogin) {
                const { data: { session }, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error

                // Explicitly sync session BEFORE navigating so the
                // middleware sees the httpOnly session_token cookie.
                // Relying on onAuthStateChange alone causes a race condition
                // where router.push fires before the cookie is set.
                if (session?.access_token) {
                    await fetch('/api/auth/sync-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ access_token: session.access_token })
                    })
                }
                if (session?.user?.id) {
                    sessionStorage.setItem("flowy_app_unlocked_user", session.user.id)
                    localStorage.setItem("flowy_last_active_at", String(Date.now()))
                }
                window.location.href = "/api/auth/start"
            } else {
                const redirectUrl = `${window.location.origin}/auth/callback`;

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                        emailRedirectTo: redirectUrl
                    },
                })
                if (error) throw error
                setMessage("Registrierung erfolgreich! Bitte überprüfe deine E-Mails.")
            }
        } catch (err: any) {
            setError(err.message || getAuthErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Bitte gib zuerst deine E-Mail-Adresse ein.")
            return
        }

        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login/reset-password`,
            })
            if (error) throw error
            setMessage("Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.")
        } catch (err: any) {
            setError(getAuthErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleQuickDigit = async (digit: string) => {
        if (!quickUnlock) return;
        if (quickPin.length >= quickUnlock.pinCode.length) return;

        const nextPin = `${quickPin}${digit}`;
        setQuickPin(nextPin);

        if (nextPin.length !== quickUnlock.pinCode.length) return;

        if (nextPin !== quickUnlock.pinCode) {
            setQuickPinError(true);
            window.setTimeout(() => {
                setQuickPin("");
                setQuickPinError(false);
            }, 450);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await fetch('/api/auth/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: quickUnlock.accessToken })
            });
            sessionStorage.setItem("flowy_app_unlocked_user", quickUnlock.userId);
            localStorage.setItem("flowy_last_active_at", String(Date.now()));
            window.location.href = "/api/auth/start";
        } catch (error) {
            console.error("[QuickUnlock]", error);
            setError("PIN-Entsperrung fehlgeschlagen. Bitte mit Passwort anmelden.");
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!quickUnlock || !isLogin) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (/^\d$/.test(event.key)) {
                event.preventDefault();
                handleQuickDigit(event.key);
                return;
            }

            if (event.key === "Backspace" || event.key === "Delete") {
                event.preventDefault();
                setQuickPin((current) => current.slice(0, -1));
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                setQuickPin("");
                setQuickPinError(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [quickUnlock, isLogin, quickPin]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050510] relative overflow-hidden font-sans selection:bg-indigo-500/30 text-white p-6">

            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Container */}
            <div className="w-full max-w-[550px] z-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">

                {/* Logo Area */}
                <div className="mb-10 relative group cursor-pointer" onClick={() => router.push('/')}>
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500 opacity-60" />
                    <div className="relative flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                        <img src="/logo.png" alt="FlowY" className="h-16 w-16 object-contain" />
                    </div>
                </div>

                {/* Back to Welcome */}
                <Link
                    href="/welcome"
                    className="mb-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Zurück zur Startseite
                </Link>

                {/* Header Text */}
                <div className="text-center mb-10 space-y-3">
                    <h1 className="text-5xl font-black tracking-tight">
                        {isLogin ? (
                            <>Willkommen <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">zurück</span></>
                        ) : (
                            <>Konto <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">erstellen</span></>
                        )}
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">
                        {isLogin
                                ? "Melden Sie sich an, um fortzufahren."
                                : "Starten Sie jetzt mit FlowY Professional."}
                    </p>
                </div>

                {isLogin && quickUnlock && (
                    <div className={cn(
                        "mb-6 w-full bg-[#0F0F1A]/70 backdrop-blur-2xl border border-indigo-500/20 rounded-[2rem] p-6 shadow-2xl ring-1 ring-white/10",
                        quickPinError && "animate-shake"
                    )}>
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300/80">Schnellzugriff</p>
                                <h2 className="mt-1 text-2xl font-black text-white">{quickUnlock.name}</h2>
                                <p className="mt-1 text-sm font-semibold text-white/45">{quickUnlock.email}</p>
                            </div>

                            <div className="mt-6 flex justify-center gap-2.5">
                                {Array.from({ length: quickUnlock.pinCode.length || 4 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "h-3.5 w-3.5 rounded-full border border-white/20 transition-all",
                                            index < quickPin.length ? "scale-110 bg-white" : "bg-white/10",
                                            quickPinError && "border-rose-400 bg-rose-400"
                                        )}
                                    />
                                ))}
                            </div>

                            {quickPinError && (
                                <p className="mt-3 text-sm font-bold text-rose-300">PIN ist nicht korrekt.</p>
                            )}

                            <div className="mt-6 grid w-full max-w-[260px] grid-cols-3 gap-2.5">
                                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                                    <button
                                        key={digit}
                                        type="button"
                                        onClick={() => handleQuickDigit(digit)}
                                        disabled={loading}
                                        className="flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-black transition hover:bg-white/15 active:scale-95 disabled:opacity-50"
                                    >
                                        {digit}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuickUnlock(null);
                                        setQuickPin("");
                                    }}
                                    className="rounded-2xl text-[10px] font-black uppercase tracking-wider text-white/35 transition hover:text-white"
                                >
                                    Passwort
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickDigit("0")}
                                    disabled={loading}
                                    className="flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-black transition hover:bg-white/15 active:scale-95 disabled:opacity-50"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickPin((current) => current.slice(0, -1))}
                                    disabled={loading}
                                    className="flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/75 transition hover:bg-white/15 active:scale-95 disabled:opacity-50"
                                >
                                    <Delete className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auth Card */}
                <div className="w-full bg-[#0F0F1A]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 md:p-12 shadow-2xl ring-1 ring-white/10">

                    <form onSubmit={handleAuth} className="space-y-6">

                            <>
                                {!isLogin && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 ml-1">Vollständiger Name</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                                            <input
                                                type="text"
                                                required
                                                placeholder="Max Mustermann"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-base font-medium text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 ml-1">E-Mail Adresse</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@firma.at"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-base font-medium text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500">Passwort</label>
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Vergessen?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-14 py-4 text-base font-medium text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 ml-1">Passwort bestätigen</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-base font-medium text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>

                        {error && (
                            <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-400 animate-in fade-in zoom-in-95">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="flex items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/20 p-4 text-sm font-medium text-green-400 animate-in fade-in zoom-in-95">
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none group"
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            ) : isLogin ? (
                                "Jetzt anmelden"
                            ) : (
                                "Konto erstellen"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-sidebar-foreground/60 font-medium">
                            {isLogin ? "Noch kein FlowY Konto? " : "Bereits ein FlowY Mitglied? "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    setError(null)
                                    setMessage(null)
                                    const newUrl = isLogin ? '/login?mode=register' : '/login?mode=login'
                                    window.history.pushState({}, '', newUrl)
                                }}
                                className="text-white hover:text-indigo-400 font-black transition-colors ml-1"
                            >
                                {isLogin ? "Jetzt registrieren" : "Hier einloggen"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="mt-12 flex justify-between w-full max-w-[400px] px-4 opacity-20 text-[9px] font-black tracking-[0.3em] uppercase text-slate-400 select-none">
                    <span>Secure Cloud</span>
                    <span>•</span>
                    <span>Made in Austria</span>
                    <span>•</span>
                    <span>V {process.env.NEXT_PUBLIC_APP_VERSION || "1.1.2"}</span>
                </div>
            </div>
        </div>
    )
}
