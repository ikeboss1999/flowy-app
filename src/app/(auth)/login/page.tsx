"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getAuthErrorMessage } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User, Eye, EyeOff } from "lucide-react"

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
    const router = useRouter()

    // Sync state with query param if it changes
    useEffect(() => {
        const mode = searchParams.get('mode')
        if (mode === 'register') setIsLogin(false)
        else if (mode === 'login') setIsLogin(true)
    }, [searchParams])

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
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push("/")
                router.refresh()
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                })
                if (error) throw error
                setMessage("Registrierung erfolgreich! Bitte überprüfe deine E-Mails.")
            }
        } catch (err: any) {
            setError(getAuthErrorMessage(err))
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

                {/* Auth Card */}
                <div className="w-full bg-[#0F0F1A]/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 md:p-12 shadow-2xl ring-1 ring-white/10">
                    <form onSubmit={handleAuth} className="space-y-6">

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
                        <p className="text-sm text-slate-500 font-medium">
                            {isLogin ? "Noch kein FlowY Konto? " : "Bereits ein FlowY Mitglied? "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    setError(null)
                                    setMessage(null)
                                    // Update URL without full refresh to preserve context
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
