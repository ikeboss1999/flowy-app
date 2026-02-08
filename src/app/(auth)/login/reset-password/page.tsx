"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { getAuthErrorMessage } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setError("Die Passwörter stimmen nicht überein.")
            return
        }

        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })
            if (error) throw error

            setMessage("Dein Passwort wurde erfolgreich aktualisiert.")
            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err: any) {
            setError(getAuthErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#05050A] relative overflow-hidden font-sans text-white">
            <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

            <div className="w-full max-w-[600px] z-10 p-6 flex flex-col items-center">
                <div className="mb-8">
                    <img src="/logo.png" alt="FlowY" className="h-16 object-contain" />
                </div>

                <div className="text-center mb-10 space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">Neues <span className="text-indigo-500">Passwort</span> setzen</h1>
                    <p className="text-slate-400 font-medium">Wähle ein sicheres Passwort für deinen Account.</p>
                </div>

                <div className="w-full bg-[#0F0F12]/80 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs uppercase font-bold tracking-widest text-slate-500 ml-1">Neues Passwort</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#05050A] border border-white/10 rounded-2xl px-6 py-4 text-base font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs uppercase font-bold tracking-widest text-slate-500 ml-1">Passwort bestätigen</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#05050A] border border-white/10 rounded-2xl px-6 py-4 text-base font-medium text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
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
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            ) : (
                                "Passwort speichern"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
