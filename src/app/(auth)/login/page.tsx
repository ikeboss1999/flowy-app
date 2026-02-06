"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        console.log('LoginPage hydrated');
        setIsHydrated(true);
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Bitte E-Mail und Passwort eingeben.');
            return;
        }

        console.log('Manual login trigger:', email);
        setLoading(true);
        setError('');

        try {
            await login({ email, password });
            console.log('Login success');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Prevent default form submission entirely
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLogin();
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[140px]" />
            </div>

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center h-24 w-24 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-indigo-500/20 p-3 mb-8 hover:scale-105 transition-transform duration-500">
                        <img src="/logo.png" alt="FlowY Logo" className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight mb-4">
                        Willkommen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">zurück</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium">Melden Sie sich an, um Ihre Baustellen zu verwalten.</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-10 lg:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@firma.de"
                                className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-medium text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1 ml-1">
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest">Passwort</label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Vergessen?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-medium text-lg"
                            />
                        </div>

                        {error && (
                            <div className="p-5 text-sm font-bold text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3">
                                <span className="text-xl">⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleLogin}
                            disabled={loading || !isHydrated}
                            className="w-full py-6 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {!isHydrated ? 'Lädt...' : (loading ? 'Prüfe Daten...' : 'Jetzt einloggen')}
                        </button>
                    </form>

                    <div className="mt-12 text-center text-slate-500 font-medium text-lg pt-8 border-t border-white/5">
                        Noch kein FlowY Konto?{' '}
                        <Link href="/register" className="text-white hover:text-indigo-400 transition-colors font-black ml-1">
                            Jetzt registrieren
                        </Link>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <div className="flex justify-center gap-8 text-[11px] text-white/20 uppercase font-black tracking-[0.3em] opacity-50">
                        <span>Made in Austria</span>
                        <span>•</span>
                        <span>FlowY - Entwickelt von Ilhan Etovic</span>
                        <span>•</span>
                        <span>Version {process.env.NEXT_PUBLIC_APP_VERSION || "1.0.3"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
