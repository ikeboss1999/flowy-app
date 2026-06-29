'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const { session, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (session) {
                // If session is established (e.g. accepted invite), redirect to password setting
                router.push('/login/reset-password');
            } else {
                // If not authenticated, redirect to login page
                router.push('/login');
            }
        }
    }, [session, isLoading, router]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050510] text-white">
            <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Authentifizierung läuft...
                </p>
            </div>
        </div>
    );
}
