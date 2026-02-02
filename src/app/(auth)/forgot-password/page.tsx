'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setMessage(data.message);
        } catch (err: any) {
            setError(err.message || 'Ein Fehler ist aufgetreten.');
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

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center h-24 w-24 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-indigo-500/20 p-3 mb-8 hover:scale-105 transition-transform duration-500">
                        <img src="/logo.png" alt="FlowY Logo" className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tight mb-4">
                        Passwort <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">vergessen?</span>
                    </h1>
                    <p className="text-lg text-slate-400 font-medium">Wir senden Ihnen einen Link zum Zurücksetzen.</p>
                </div>

                {/* Form Container */}
                <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-10 lg:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                    {message ? (
                        <div className="text-center">
                            <div className="p-6 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20 mb-10 text-lg font-bold">
                                {message}
                            </div>
                            <Link href="/login">
                                <button className="w-full py-6 px-8 bg-white/5 hover:bg-white/10 text-white font-black text-xl rounded-2xl border border-white/10 transition-all">
                                    Zurück zum Login
                                </button>
                            </Link>
                        </div>
                    ) : (
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

                            {error && (
                                <div className="p-5 text-sm font-bold text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3">
                                    <span className="text-xl">⚠️</span> {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? 'Senden...' : 'Link senden'}
                            </button>

                            <div className="text-center pt-2">
                                <Link href="/login" className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-sm">
                                    Abbrechen
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[11px] text-white/20 uppercase font-black tracking-[0.4em]">FlowY Support • Secure Recovery</p>
                </div>
            </div>
        </div>
    );
}
