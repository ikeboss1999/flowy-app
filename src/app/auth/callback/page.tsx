'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const { session, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!isLoading) {
            if (session) {
                // New company registrations continue with onboarding; invitations still set a password.
                router.push(searchParams.get('flow') === 'signup' ? '/onboarding' : '/login/reset-password');
            } else {
                // If not authenticated, redirect to login page
                router.push('/login');
            }
        }
    }, [session, isLoading, router, searchParams]);

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
