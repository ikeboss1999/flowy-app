
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react"

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

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
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#05050A] relative overflow-hidden font-sans selection:bg-indigo-500/30 text-white">

            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            {/* Main Container - Scaled Up */}
            <div className="w-full max-w-[700px] z-10 p-6 flex flex-col items-center scale-105 transform origin-center">

                {/* Logo Area */}
                <div className="mb-8 relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500 opacity-60" />
                    <div className="relative flex items-center justify-center">
                        <img src="/logo.png" alt="FlowY" className="h-24 object-contain" />
                    </div>
                </div>

                {/* Header Text */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-6xl font-bold tracking-tight">
                        {isLogin ? (
                            <>Willkommen <span className="text-indigo-500">zurück</span></>
                        ) : (
                            <>Willkommen bei <span className="text-indigo-500">FlowY</span></>
                        )}
                    </h1>
                    <p className="text-slate-400 text-lg font-medium">
                        {isLogin
                            ? "Melden Sie sich an, um Ihre Baustellen zu verwalten."
                            : "Die Komplettlösung für Ihr Baumanagement. Starten Sie jetzt."}
                    </p>
                </div>

                {/* Login/Register Card */}
                <div className="w-full bg-[#0F0F12]/80 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-14 shadow-2xl ring-1 ring-white/5">
                    <form onSubmit={handleAuth} className="space-y-8">

                        {!isLogin && (
                            <div className="space-y-3">
                                <label className="text-xs uppercase font-bold tracking-widest text-slate-500 ml-1">Vollständiger Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Max Mustermann"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-[#05050A] border border-white/10 rounded-2xl px-6 py-5 text-base font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-xs uppercase font-bold tracking-widest text-slate-500 ml-1">E-Mail Adresse</label>
                            <input
                                type="email"
                                required
                                placeholder="name@firma.at"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#05050A] border border-white/10 rounded-2xl px-6 py-5 text-base font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs uppercase font-bold tracking-widest text-slate-500">Passwort</label>
                                {isLogin && <button type="button" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Vergessen?</button>}
                            </div>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#05050A] border border-white/10 rounded-2xl px-6 py-5 text-base font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-400">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm font-medium text-green-400">
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-6 w-6 animate-spin inline" />
                            ) : isLogin ? (
                                "Jetzt einloggen"
                            ) : (
                                "Jetzt kostenlos registrieren"
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm text-slate-500 font-medium">
                            {isLogin ? "Noch kein FlowY Konto? " : "Bereits ein FlowY Mitglied? "}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin)
                                    setError(null)
                                    setMessage(null)
                                }}
                                className="text-white hover:text-indigo-400 font-bold transition-colors ml-1"
                            >
                                {isLogin ? "Jetzt registrieren" : "Hier einloggen"}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Credits */}
                <div className="mt-16 flex justify-between w-full max-w-sm px-4 opacity-30 text-[10px] font-black tracking-widest uppercase text-slate-400 select-none">
                    <span>Secure SSL</span>
                    <span>Made in Austria</span>
                    <span>V 1.0.4</span>
                </div>
            </div>
        </div>
    )
}
