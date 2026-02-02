'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwörter stimmen nicht überein');
            setLoading(false);
            return;
        }

        try {
            await register({ name, email, password });
            // Redirect to login page
            router.push('/login');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[140px]" />
            </div>

            <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center h-24 w-24 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-indigo-500/20 p-3 mb-8 hover:scale-105 transition-transform duration-500">
                        <img src="/logo.png" alt="FlowY Logo" className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                        Willkommen bei <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">FlowY</span>
                    </h1>
                    <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
                        Die Komplettlösung für Ihr Baumanagement. <br className="hidden md:block" /> Starten Sie jetzt und optimieren Sie Ihre Projekte.
                    </p>
                </div>

                {/* Form Container */}
                <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-8 lg:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {/* Left Side Inputs */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Vollständiger Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Max Mustermann"
                                    className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-medium text-lg"
                                />
                            </div>

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
                        </div>

                        {/* Right Side Inputs */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Passwort wählen</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    minLength={8}
                                    className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-medium text-lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Bestätigen</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-white placeholder:text-slate-700 font-medium text-lg"
                                />
                            </div>
                        </div>

                        {/* Full Width Footer Section */}
                        <div className="md:col-span-2 pt-4">
                            {error && (
                                <div className="mb-8 p-5 text-sm font-bold text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3">
                                    <span className="text-xl">⚠️</span> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 px-8 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? 'Konto wird erstellt...' : 'Jetzt kostenlos registrieren'}
                            </button>

                            <div className="mt-10 text-center text-slate-500 font-medium text-lg">
                                Bereits ein FlowY Mitglied?{' '}
                                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-black ml-1">
                                    Hier einloggen
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="mt-12 text-center">
                    <div className="flex justify-center gap-8 text-[11px] text-white/20 uppercase font-black tracking-[0.3em]">
                        <span>Secure SSL</span>
                        <span>•</span>
                        <span>Made in Germany</span>
                        <span>•</span>
                        <span>v2.0 Professional</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
