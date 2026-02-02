'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (initialEmail) {
            setEmail(initialEmail);
        }
    }, [initialEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setSuccess(true);
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError(err.message || 'Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-green-500/20 shadow-2xl shadow-green-500/20">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-4xl font-black text-white mb-4">E-Mail bestätigt!</h1>
                <p className="text-xl text-slate-400 font-medium mb-10">Ihr Konto ist nun aktiv. Wir leiten Sie zum Login weiter...</p>
                <div className="flex justify-center">
                    <div className="w-12 h-1 bg-indigo-600 rounded-full animate-loader"></div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header Section */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-[2rem] bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-indigo-500/20 p-3 mb-8 hover:scale-105 transition-transform duration-500">
                    <img src="/logo.png" alt="FlowY Logo" className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
                </div>
                <h1 className="text-5xl font-black text-white tracking-tight mb-4 leading-tight">
                    E-Mail <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">bestätigen</span>
                </h1>
                <p className="text-lg text-slate-400 font-medium">Geben Sie den 6-stelligen Code ein, den wir Ihnen gesendet haben.</p>
            </div>

            {/* Form Container */}
            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 p-10 lg:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Ihre E-Mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@firma.de"
                            readOnly={!!initialEmail}
                            className="w-full px-6 py-5 bg-slate-950/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-700 font-medium text-lg disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">6-Stelliger Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            placeholder="000000"
                            maxLength={6}
                            className="w-full px-6 py-8 bg-slate-950 border border-indigo-500/30 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-white text-center text-4xl font-black tracking-[0.5em] placeholder:text-slate-800"
                        />
                    </div>

                    {error && (
                        <div className="p-5 text-sm font-bold text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex items-center gap-3">
                            <span className="text-xl">⚠️</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="w-full py-6 px-8 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? 'Prüfung läuft...' : 'Code bestätigen'}
                    </button>

                    <div className="text-center">
                        <button type="button" className="text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors uppercase tracking-widest">
                            Code erneut senden
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

export default function VerifyPage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-blue-600/10 rounded-full blur-[140px]" />
            </div>

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in zoom-in-95 duration-700">
                <Suspense fallback={<div className="text-white text-center">Laden...</div>}>
                    <VerifyForm />
                </Suspense>

                <div className="mt-12 text-center">
                    <Link href="/register" className="text-[11px] text-white/20 hover:text-white/40 uppercase font-black tracking-[0.4em] transition-colors">
                        Zurück zur Registrierung
                    </Link>
                </div>
            </div>

            <style jsx global>{`
                @keyframes loader {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-loader {
                    animation: loader 1.5s infinite linear;
                    width: 40px;
                }
            `}</style>
        </div>
    );
}
